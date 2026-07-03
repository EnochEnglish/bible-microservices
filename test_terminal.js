const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const pages = contexts.flatMap(c => c.pages());
  
  for (const page of pages) {
    if (page.url().includes('ecs-workbench')) {
      console.log('Found Workbench page:', page.url());
      
      const result = await page.evaluate(() => {
        const iframes = document.querySelectorAll('iframe');
        let r = 'iframes:' + iframes.length;
        for (let i = 0; i < iframes.length; i++) {
          try {
            const w = iframes[i].contentWindow;
            const ts = w.document.querySelectorAll('.xterm');
            r += '|iframe' + i + ':xterm=' + ts.length;
            
            // Try various terminal object paths
            const termPaths = ['term', 'terminal', 't', 'xterm', 'fitAddon'];
            for (const tp of termPaths) {
              if (w[tp]) r += '|w.' + tp + '=' + typeof w[tp];
            }
            
            // Try to find term in window.__xterm__ or similar
            const winKeys = Object.keys(w).filter(k => k.toLowerCase().includes('term') || k.startsWith('_'));
            r += '|winKeys:' + winKeys.slice(0,20).join(',');
            
          } catch(e) {
            r += '|err:' + e.message;
          }
        }
        
        // Also check main page for terminal
        const mainTerms = document.querySelectorAll('.xterm');
        r += '|mainXterm:' + mainTerms.length;
        
        // Check for monaco or other editors
        if (window.monaco) r += '|hasMonaco';
        
        return r;
      });
      
      console.log('Result:', result);
      
      // Try to paste via xterm helper element
      const helper = await page.locator('textarea.xterm-helper-textarea').first();
      if (helper) {
        await helper.fill('');
        await helper.type('echo hello > /var/www/html/hello.txt\n');
        console.log('Typed via xterm helper textarea');
      } else {
        console.log('No xterm helper textarea found');
      }
      
      break;
    }
  }
  
  await browser.close();
})();
