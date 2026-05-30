#!/usr/bin/env python3
"""
Import KJV OSIS XML into bible-text-service via REST API.
Uses lxml for proper XPath namespace support.
"""

import sys
import re
import requests
from lxml import etree

OSIS_NS = 'http://www.bibletechnologies.net/2003/OSIS/namespace'
NS = {'osis': OSIS_NS}


def parse_osis(filepath):
    """Parse OSIS XML file and extract translation + books + verses."""
    tree = etree.parse(filepath)
    root = tree.getroot()

    # Find osisText element
    osis_text_el = root.find('.//osis:osisText', NS)
    identifier = osis_text_el.get('osisIDWork', 'kjv') if osis_text_el is not None else 'kjv'

    # Clean identifier
    translation_code = identifier.split('.')[-1] if '.' in identifier else identifier

    # Extract translation name from <work><title>
    translation_name = 'King James Version'
    for title_el in root.findall('.//osis:work/osis:title', NS):
        if title_el.text:
            translation_name = title_el.text
            break

    books = []
    verses = []

    # Find all book <div type="book">
    book_divs = root.findall('.//osis:div[@type="book"]', NS)

    for idx, book_div in enumerate(book_divs):
        osis_id = book_div.get('osisID', 'BOOK{0}'.format(idx))
        book_id = osis_id.upper()

        books.append({
            'bookId': book_id,
            'name': osis_id,
            'abbreviation': book_id[:3],
            'testament': 'OT' if idx < 39 else 'NT',
            'chapterCount': 0,
            'sortOrder': idx
        })

        # Iterate through the book in document order
        current_chapter = 0
        current_verse_num = 0
        verse_parts = []

        def flush_verse():
            nonlocal current_verse_num, verse_parts
            if current_verse_num > 0 and verse_parts:
                text = ''.join(verse_parts).strip()
                text = re.sub(r'\s+', ' ', text)
                verses.append({
                    'bookId': book_id,
                    'chapter': current_chapter,
                    'verse': current_verse_num,
                    'text': text
                })
                verse_parts = []

        # Walk all elements in document order under the book div
        for event, elem in etree.iterwalk(book_div, events=('start', 'end')):
            tag = elem.tag
            # Strip namespace
            if '}' in tag:
                tag = tag.split('}', 1)[1]

            if event == 'start':
                if tag == 'chapter':
                    s_id = elem.get('sID')
                    n = elem.get('n')
                    if s_id is not None and n is not None:
                        flush_verse()
                        current_verse_num = 0
                        verse_parts = []
                        try:
                            current_chapter = int(n)
                            if current_chapter > books[-1]['chapterCount']:
                                books[-1]['chapterCount'] = current_chapter
                        except:
                            pass

                elif tag == 'verse':
                    s_id = elem.get('sID')
                    e_id = elem.get('eID')
                    n = elem.get('n')
                    osis_id_v = elem.get('osisID')

                    if s_id is not None:
                        # Milestone start
                        flush_verse()
                        verse_parts = []
                        try:
                            current_verse_num = int(n) if n else 0
                        except:
                            current_verse_num = 0

                    elif e_id is not None:
                        # Milestone end
                        flush_verse()
                        current_verse_num = 0
                        verse_parts = []
                        # No tail for milestone end elements
                        elem.tail = None

                    elif elem.text is not None or len(elem) > 0:
                        # Container model
                        try:
                            v_num = int(n) if n else 0
                        except:
                            v_num = 0
                        if v_num == 0 and osis_id_v:
                            parts = osis_id_v.split('.')
                            if len(parts) >= 3:
                                try:
                                    v_num = int(parts[2])
                                except:
                                    pass
                        text = ''.join(elem.itertext()).strip()
                        text = re.sub(r'\s+', ' ', text)
                        if v_num > 0:
                            verses.append({
                                'bookId': book_id,
                                'chapter': current_chapter,
                                'verse': v_num,
                                'text': text
                            })

                elif tag == 'transChange':
                    # Inline - include its text in current verse
                    txt = ''.join(elem.itertext())
                    if current_verse_num > 0:
                        verse_parts.append(txt)

                else:
                    # Collect text before children
                    if elem.text and current_verse_num > 0:
                        verse_parts.append(elem.text)

            elif event == 'end':
                # Collect tail text after element
                if elem.tail and current_verse_num > 0:
                    verse_parts.append(elem.tail)

        # Flush last verse
        flush_verse()

    return {
        'translationCode': translation_code,
        'translationName': translation_name,
        'language': 'en',
        'books': books,
        'verses': verses
    }


def main():
    filepath = (sys.argv[1] if len(sys.argv) > 1
                else r'C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\temp\eng-kjv.osis.xml')
    text_service_url = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8081'

    print('Parsing {0}...'.format(filepath))
    data = parse_osis(filepath)

    print('Translation: {0} ({1})'.format(data['translationName'], data['translationCode']))
    print('Books: {0}'.format(len(data['books'])))
    print('Verses: {0}'.format(len(data['verses'])))

    if len(data['verses']) == 0:
        print('ERROR: No verses parsed!')
        # Debug: show first book structure
        return

    # Show sample
    print('Sample verse: {0}'.format(data['verses'][0]))

    # Import in batches
    batch_size = 500
    all_verses = data['verses']

    for i in range(0, max(len(all_verses), 1), batch_size):
        end = min(i + batch_size, len(all_verses))
        batch = all_verses[i:end]
        payload = {
            'translationCode': data['translationCode'],
            'translationName': data['translationName'],
            'language': 'en',
            'books': data['books'] if i == 0 else [],
            'verses': batch
        }

        print('Sending verses {0}-{1}/{2}...'.format(i, end, len(all_verses)))
        try:
            resp = requests.post(
                '{0}/api/v1/bible/import'.format(text_service_url),
                json=payload,
                timeout=120
            )
            resp.raise_for_status()
            r = resp.json()
            print('  OK: status={0}'.format(r.get('status', r)))
        except Exception as e:
            print('  ERROR: {0}'.format(e))
            sys.exit(1)

    print('Done! Imported {0} verses across {1} books.'.format(
        len(all_verses), len(data['books'])))


if __name__ == '__main__':
    main()