package com.bible.monolith.service

/**
 * TSK（Treasure of Scripture Knowledge）交叉引用数据
 *
 * 涵盖大多数常用经文对，内嵌于代码中，无需外部数据库
 */
object CrossRefService {

    // Gen -> Exo -> Lev -> Num -> Deu -> Jos -> ... -> Rev
    // 格式: "GEN.1.1" -> listOf("GEN.1.1", ...)
    private val data: Map<String, List<String>> = buildMap {

        // ===== Genesis =====
        put("GEN.1.1", listOf("PSA.33.6", "PSA.102.25", "ISA.44.24", "JER.10.12", "JER.51.15", "JHN.1.1", "ACT.14.15", "COL.1.16", "HEB.1.10", "HEB.11.3", "REV.4.11"))
        put("GEN.1.2", listOf("PSA.33.6", "ISA.40.13", "JER.4.23"))
        put("GEN.1.3", listOf("PSA.33.9", "2CO.4.6", "EPH.5.14", "2PE.1.19"))
        put("GEN.1.26", listOf("GEN.3.22", "GEN.11.7", "PSA.100.3", "ECC.7.29", "ACT.17.26", "1CO.11.7", "EPH.4.24", "COL.3.10", "JAM.3.9"))
        put("GEN.1.27", listOf("GEN.5.1", "GEN.9.6", "MAT.19.4", "MAR.10.6", "1CO.11.7", "EPH.4.24", "COL.3.10"))
        put("GEN.2.2", listOf("EXO.20.11", "EXO.31.17", "DEU.5.14", "HEB.4.4"))
        put("GEN.2.3", listOf("NEH.9.14", "ISA.58.13", "MAR.2.27"))
        put("GEN.2.7", listOf("GEN.3.19", "PSA.103.14", "ECC.12.7", "1CO.15.45"))
        put("GEN.2.17", listOf("GEN.3.1", "ROM.5.12", "ROM.6.23", "JAM.1.15"))
        put("GEN.3.1", listOf("MAT.10.16", "2CO.11.3", "REV.12.9", "REV.20.2"))
        put("GEN.3.6", listOf("1TI.2.14", "JAM.1.14", "1JN.2.16"))
        put("GEN.3.15", listOf("ISA.7.14", "MAT.1.23", "LUK.1.35", "GAL.4.4", "1JN.3.8"))
        put("GEN.3.16", listOf("1CO.14.34", "EPH.5.22", "1TI.2.11"))
        put("GEN.3.17", listOf("GEN.5.29", "ECC.1.2", "ROM.8.20"))
        put("GEN.3.19", listOf("GEN.2.7", "JOB.21.26", "PSA.90.3", "ECC.3.20", "ECC.12.7", "ROM.5.12", "1CO.15.22"))
        put("GEN.4.4", listOf("LEV.3.16", "NUM.18.17", "HEB.11.4"))
        put("GEN.5.24", listOf("2KI.2.11", "HEB.11.5", "JUD.1.14"))
        put("GEN.6.8", listOf("GEN.19.19", "EXO.33.12", "LUK.1.30", "ACT.7.46"))
        put("GEN.6.9", listOf("GEN.5.22", "JOB.1.1", "LUK.1.6", "HEB.11.7"))
        put("GEN.12.1", listOf("ACT.7.3", "HEB.11.8"))
        put("GEN.12.3", listOf("GEN.18.18", "GEN.22.18", "GEN.26.4", "ACT.3.25", "GAL.3.8", "GAL.3.16"))
        put("GEN.14.18", listOf("PSA.110.4", "HEB.5.6", "HEB.7.1"))
        put("GEN.15.1", listOf("PSA.27.1", "PSA.84.11", "ISA.41.10", "LUK.12.32"))
        put("GEN.15.6", listOf("ROM.4.3", "ROM.4.9", "ROM.4.22", "GAL.3.6", "JAM.2.23"))
        put("GEN.17.1", listOf("GEN.5.22", "GEN.6.9", "DEU.18.13", "JOB.1.1", "MAT.5.48"))
        put("GEN.22.8", listOf("JHN.1.29", "JHN.1.36", "1PE.1.19", "REV.5.6"))
        put("GEN.22.18", listOf("GEN.12.3", "GEN.26.4", "PSA.72.17", "ACT.3.25", "GAL.3.8"))
        put("GEN.28.12", listOf("JHN.1.51"))
        put("GEN.49.10", listOf("NUM.24.17", "PSA.60.7", "ISA.11.1", "ISA.42.1", "LUK.1.32", "JHN.1.49", "REV.5.5"))

        // ===== Exodus =====
        put("EXO.3.14", listOf("ISA.44.6", "JHN.8.58", "2CO.1.20", "HEB.13.8", "REV.1.8"))
        put("EXO.12.3", listOf("1CO.5.7"))
        put("EXO.20.3", listOf("DEU.5.7", "ISA.43.11", "MAT.4.10"))
        put("EXO.20.8", listOf("GEN.2.3", "DEU.5.12", "NEH.13.15", "ISA.58.13", "MAR.2.27", "ACT.20.7", "REV.1.10"))
        put("EXO.20.12", listOf("DEU.5.16", "MAT.15.4", "EPH.6.2", "COL.3.20"))

        // ===== Deuteronomy =====
        put("DEU.6.4", listOf("ISA.44.6", "MAR.12.29", "JHN.10.30", "1CO.8.4", "EPH.4.5"))
        put("DEU.6.5", listOf("MAT.22.37", "MAR.12.30", "LUK.10.27"))
        put("DEU.18.15", listOf("JHN.1.45", "ACT.3.22", "ACT.7.37"))
        put("DEU.32.4", listOf("2SA.22.31", "PSA.18.30", "ISA.45.21", "DAN.4.37", "ROM.9.14"))

        // ===== Psalms =====
        put("PSA.1.1", listOf("PRO.1.15", "PRO.4.14", "JER.15.17", "1CO.15.33"))
        put("PSA.2.7", listOf("ACT.13.33", "HEB.1.5", "HEB.5.5"))
        put("PSA.8.2", listOf("MAT.21.16", "1CO.1.27"))
        put("PSA.14.1", listOf("PSA.10.4", "PSA.53.1", "ROM.3.10"))
        put("PSA.16.10", listOf("ACT.2.27", "ACT.2.31", "ACT.13.35"))
        put("PSA.19.1", listOf("ROM.1.19", "ROM.1.20"))
        put("PSA.22.1", listOf("MAT.27.46", "MAR.15.34"))
        put("PSA.22.18", listOf("MAT.27.35", "MAR.15.24", "JHN.19.24"))
        put("PSA.23.1", listOf("JHN.10.11", "1PE.2.25", "REV.7.17"))
        put("PSA.23.4", listOf("PSA.3.6", "PSA.46.2", "JOB.13.15", "ISA.43.2"))
        put("PSA.24.3", listOf("PSA.15.1", "ISA.33.14", "MAT.5.8", "HEB.12.14"))
        put("PSA.34.8", listOf("HEB.6.5", "1PE.2.3"))
        put("PSA.51.5", listOf("JOB.14.4", "JOB.25.4", "JHN.3.6", "ROM.5.12", "EPH.2.3"))
        put("PSA.51.10", listOf("JER.32.39", "EZE.11.19", "EZE.36.26", "2CO.5.17"))
        put("PSA.68.18", listOf("EPH.4.8"))
        put("PSA.69.9", listOf("JHN.2.17", "ROM.15.3"))
        put("PSA.78.2", listOf("MAT.13.35"))
        put("PSA.90.4", listOf("2PE.3.8"))
        put("PSA.95.7", listOf("HEB.3.7", "HEB.3.15", "HEB.4.7"))
        put("PSA.103.12", listOf("ISA.38.17", "ISA.43.25", "MIC.7.19"))
        put("PSA.110.1", listOf("MAT.22.44", "MAR.12.36", "LUK.20.42", "ACT.2.34", "HEB.1.13"))
        put("PSA.110.4", listOf("HEB.5.6", "HEB.6.20", "HEB.7.17"))
        put("PSA.118.22", listOf("MAT.21.42", "MAR.12.10", "LUK.20.17", "ACT.4.11", "1PE.2.7"))
        put("PSA.119.105", listOf("PRO.6.23", "2PE.1.19"))
        put("PSA.119.11", listOf("PSA.37.31", "LUK.2.19", "LUK.2.51", "COL.3.16"))

        // ===== Proverbs =====
        put("PRO.3.5", listOf("PSA.37.3", "PSA.37.5", "JER.17.7"))
        put("PRO.3.6", listOf("1CH.28.9", "PHI.4.6", "JAM.1.5"))
        put("PRO.8.22", listOf("JHN.1.1", "COL.1.15", "REV.3.14"))
        put("PRO.14.12", listOf("PRO.16.25", "MAT.7.13"))
        put("PRO.22.6", listOf("EPH.6.4", "2TI.3.15"))

        // ===== Isaiah =====
        put("ISA.1.18", listOf("PSA.51.7", "ISA.43.25", "ISA.44.22", "REV.7.14"))
        put("ISA.6.3", listOf("REV.4.8"))
        put("ISA.7.14", listOf("MAT.1.23", "LUK.1.31"))
        put("ISA.9.6", listOf("MAT.28.18", "LUK.2.11", "JHN.3.16", "EPH.2.14", "TIT.2.13"))
        put("ISA.40.3", listOf("MAT.3.3", "MAR.1.3", "LUK.3.4", "JHN.1.23"))
        put("ISA.40.31", listOf("PSA.103.5", "2CO.4.16"))
        put("ISA.53.1", listOf("JHN.12.38", "ROM.10.16"))
        put("ISA.53.3", listOf("PSA.22.6", "MAR.9.12", "HEB.12.2"))
        put("ISA.53.5", listOf("ROM.4.25", "1CO.15.3", "2CO.5.21", "1PE.2.24"))
        put("ISA.53.6", listOf("PSA.119.176", "1PE.2.25"))
        put("ISA.53.7", listOf("MAT.26.63", "MAR.14.61", "ACT.8.32", "1PE.2.23"))
        put("ISA.53.9", listOf("MAT.27.57", "1PE.2.22", "1JN.3.5"))
        put("ISA.53.12", listOf("MAR.15.28", "LUK.22.37", "LUK.23.34", "HEB.9.28"))
        put("ISA.55.1", listOf("JHN.4.14", "JHN.7.37", "REV.22.17"))
        put("ISA.55.8", listOf("2SA.7.19", "PSA.40.5", "ROM.11.33"))
        put("ISA.61.1", listOf("LUK.4.18"))

        // ===== Jeremiah =====
        put("JER.31.15", listOf("MAT.2.17"))
        put("JER.31.31", listOf("HEB.8.8", "HEB.8.10", "HEB.10.16"))

        // ===== Daniel =====
        put("DAN.12.2", listOf("MAT.25.46", "JHN.5.28"))

        // ===== Micah =====
        put("MIC.5.2", listOf("MAT.2.6", "LUK.2.4", "JHN.7.42"))
        put("MIC.6.8", listOf("DEU.10.12", "1SA.15.22", "HOS.6.6", "MAR.12.33"))

        // ===== Malachi =====
        put("MAL.3.1", listOf("MAT.11.10", "MAR.1.2", "LUK.1.76", "LUK.7.27"))
        put("MAL.4.5", listOf("MAT.11.14", "MAT.17.11", "MAR.9.11", "LUK.1.17"))

        // ===== Matthew =====
        put("MAT.1.23", listOf("ISA.7.14"))
        put("MAT.2.6", listOf("MIC.5.2"))
        put("MAT.3.3", listOf("ISA.40.3", "MAR.1.3", "LUK.3.4"))
        put("MAT.4.4", listOf("DEU.8.3", "LUK.4.4"))
        put("MAT.4.7", listOf("DEU.6.16"))
        put("MAT.4.10", listOf("DEU.6.13", "DEU.10.20", "JAM.4.7"))
        put("MAT.5.3", listOf("LUK.6.20", "PSA.34.18", "PRO.16.19", "ISA.57.15", "ISA.66.2"))
        put("MAT.5.8", listOf("PSA.24.4", "PSA.51.10", "HEB.12.14"))
        put("MAT.5.14", listOf("JHN.8.12", "JHN.9.5", "PHI.2.15"))
        put("MAT.5.16", listOf("1PE.2.12"))
        put("MAT.5.17", listOf("ROM.3.31", "ROM.7.12", "GAL.3.17"))
        put("MAT.5.44", listOf("EXO.23.4", "LUK.6.27", "ROM.12.14"))
        put("MAT.6.9", listOf("LUK.11.2"))
        put("MAT.6.33", listOf("1KI.3.13", "PSA.37.25", "PSA.84.11", "MAR.10.30"))
        put("MAT.7.7", listOf("LUK.11.9", "JHN.14.13", "JAM.1.5", "1JN.5.15"))
        put("MAT.7.12", listOf("LUK.6.31", "ROM.13.8"))
        put("MAT.11.28", listOf("ISA.55.1", "JHN.6.37", "JHN.7.37"))
        put("MAT.16.18", listOf("JHN.1.42", "1CO.3.11", "EPH.2.20"))
        put("MAT.18.20", listOf("MAT.28.20", "JHN.14.23"))
        put("MAT.21.9", listOf("PSA.118.26", "MAR.11.9", "LUK.19.38", "JHN.12.13"))
        put("MAT.22.37", listOf("DEU.6.5", "DEU.10.12", "MAR.12.30"))
        put("MAT.22.39", listOf("LEV.19.18", "MAR.12.31", "GAL.5.14", "JAM.2.8"))
        put("MAT.24.14", listOf("MAR.13.10", "ROM.10.18", "COL.1.6", "COL.1.23"))
        put("MAT.26.28", listOf("EXO.24.8", "LEV.17.11", "HEB.9.22", "HEB.13.20"))
        put("MAT.28.19", listOf("MAR.16.15", "ACT.1.8", "ROM.10.18"))

        // ===== John =====
        put("JHN.1.1", listOf("PRO.8.22", "COL.1.17", "1JN.1.1", "REV.19.13"))
        put("JHN.1.14", listOf("ISA.7.14", "MAT.1.16", "ROM.1.3", "GAL.4.4", "HEB.2.14", "1JN.1.1"))
        put("JHN.1.29", listOf("GEN.22.8", "ISA.53.7", "ACT.8.32", "1PE.1.19", "REV.5.6"))
        put("JHN.3.3", listOf("JHN.1.13", "1PE.1.23", "1JN.3.9"))
        put("JHN.3.5", listOf("MAR.16.16", "ACT.2.38", "TIT.3.5"))
        put("JHN.3.6", listOf("GEN.5.3", "ROM.8.5", "GAL.5.17"))
        put("JHN.3.14", listOf("NUM.21.8", "MAT.26.54"))
        put("JHN.3.16", listOf("ROM.5.8", "ROM.8.32", "GAL.2.20", "EPH.2.4", "1JN.4.9", "1JN.4.10"))
        put("JHN.3.17", listOf("JHN.12.47", "LUK.9.56"))
        put("JHN.4.14", listOf("JHN.6.35", "JHN.7.38", "REV.21.6"))
        put("JHN.4.24", listOf("PHI.3.3"))
        put("JHN.5.24", listOf("JHN.3.16", "JHN.6.40", "JHN.20.31"))
        put("JHN.5.39", listOf("LUK.16.29", "ACT.17.11", "2TI.3.15"))
        put("JHN.6.35", listOf("JHN.4.14", "JHN.7.37"))
        put("JHN.6.44", listOf("JER.31.3", "HOS.2.14", "EPH.2.8"))
        put("JHN.6.55", listOf("MAT.26.26", "MAR.14.22"))
        put("JHN.8.12", listOf("ISA.9.2", "ISA.49.6", "JHN.1.4", "JHN.9.5"))
        put("JHN.8.32", listOf("ROM.6.18", "GAL.5.1", "JAM.1.25"))
        put("JHN.8.58", listOf("EXO.3.14", "COL.1.17", "HEB.13.8"))
        put("JHN.10.9", listOf("JHN.14.6", "EPH.2.18"))
        put("JHN.10.11", listOf("PSA.23.1", "ISA.40.11", "EZE.34.23", "HEB.13.20", "1PE.2.25"))
        put("JHN.10.28", listOf("JHN.17.12", "ROM.8.35", "1PE.1.5"))
        put("JHN.11.25", listOf("JHN.5.21", "1CO.15.20", "REV.1.18"))
        put("JHN.13.34", listOf("LEV.19.18", "JHN.15.12", "1JN.3.23"))
        put("JHN.14.2", listOf("2CO.5.1", "HEB.11.16"))
        put("JHN.14.6", listOf("ACT.4.12", "HEB.10.19"))
        put("JHN.14.16", listOf("JHN.16.7", "ROM.8.26"))
        put("JHN.14.26", listOf("LUK.24.49", "JHN.16.13"))
        put("JHN.15.5", listOf("ROM.12.5", "GAL.2.20", "PHI.4.13"))
        put("JHN.16.33", listOf("ROM.8.37", "1JN.4.4", "1JN.5.4"))
        put("JHN.17.3", listOf("1CO.8.6", "1JN.5.20"))
        put("JHN.17.17", listOf("PSA.119.9", "JAM.1.18", "1PE.1.22"))
        put("JHN.17.21", listOf("ACT.4.32", "GAL.3.28"))
        put("JHN.20.28", listOf("PSA.45.6", "ACT.7.59", "HEB.1.8"))

        // ===== Acts =====
        put("ACT.1.8", listOf("LUK.24.49", "JHN.15.26"))
        put("ACT.2.17", listOf("JOE.2.28", "ZEC.12.10"))
        put("ACT.2.21", listOf("JOE.2.32", "ROM.10.13"))
        put("ACT.2.38", listOf("ACT.3.19", "LUK.24.47"))
        put("ACT.4.12", listOf("MAT.1.21", "JHN.3.36", "1TI.2.5"))
        put("ACT.7.55", listOf("PSA.110.1", "HEB.1.3"))
        put("ACT.10.43", listOf("ISA.53.5", "JER.31.34", "DAN.9.24", "ROM.3.25"))
        put("ACT.16.31", listOf("JHN.3.16", "ROM.10.9", "1JN.3.23"))
        put("ACT.17.11", listOf("ISA.34.16", "LUK.16.29", "JHN.5.39"))

        // ===== Romans =====
        put("ROM.1.16", listOf("PSA.40.9", "1CO.1.18", "2TI.1.8"))
        put("ROM.1.17", listOf("HAB.2.4", "GAL.3.11", "HEB.10.38"))
        put("ROM.1.20", listOf("PSA.19.1", "JOB.12.7", "ACT.14.17"))
        put("ROM.2.4", listOf("ISA.30.18", "2PE.3.9"))
        put("ROM.3.23", listOf("ROM.5.12", "GAL.3.22", "ECC.7.20"))
        put("ROM.3.24", listOf("ISA.53.11", "MAT.20.28", "EPH.2.8", "TIT.3.5"))
        put("ROM.3.28", listOf("ROM.4.5", "GAL.2.16"))
        put("ROM.4.3", listOf("GEN.15.6", "GAL.3.6", "JAM.2.23"))
        put("ROM.5.1", listOf("ISA.32.17", "JHN.14.27", "PHI.4.7"))
        put("ROM.5.8", listOf("JHN.3.16", "JHN.15.13", "1JN.4.9"))
        put("ROM.5.12", listOf("GEN.2.17", "GEN.3.6", "1CO.15.21"))
        put("ROM.6.3", listOf("GAL.3.27", "COL.2.12"))
        put("ROM.6.23", listOf("GEN.2.17", "ROM.5.12", "JAM.1.15", "1JN.5.11"))
        put("ROM.8.1", listOf("ROM.10.4", "GAL.5.18"))
        put("ROM.8.6", listOf("GAL.6.8"))
        put("ROM.8.9", listOf("1CO.3.16", "GAL.4.6", "PHP.1.19"))
        put("ROM.8.14", listOf("JHN.1.12", "GAL.4.5", "EPH.1.5"))
        put("ROM.8.18", listOf("2CO.4.17", "1PE.4.13"))
        put("ROM.8.28", listOf("GEN.50.20", "PSA.46.1", "EPH.1.11"))
        put("ROM.8.38", listOf("JHN.10.28", "1CO.15.55"))
        put("ROM.9.16", listOf("PSA.110.3", "EPH.2.4", "TIT.3.5"))
        put("ROM.10.9", listOf("MAT.10.32", "LUK.12.8", "PHP.2.11"))
        put("ROM.10.17", listOf("JHN.20.31", "1PE.1.23"))
        put("ROM.12.1", listOf("1CO.6.20", "1PE.2.5"))
        put("ROM.12.2", listOf("EPH.4.23", "COL.3.10", "1PE.1.14"))
        put("ROM.13.1", listOf("PRO.8.15", "DAN.2.21", "TIT.3.1", "1PE.2.13"))
        put("ROM.13.10", listOf("MAT.22.39", "GAL.5.14", "JAM.2.8"))

        // ===== 1 Corinthians =====
        put("1CO.1.18", listOf("ROM.1.16", "2CO.2.15"))
        put("1CO.1.24", listOf("COL.2.3", "PRO.8.22"))
        put("1CO.2.9", listOf("ISA.64.4"))
        put("1CO.2.14", listOf("JHN.3.3", "ROM.8.7"))
        put("1CO.3.11", listOf("ISA.28.16", "MAT.16.18", "EPH.2.20"))
        put("1CO.3.16", listOf("1CO.6.19", "2CO.6.16", "EPH.2.22"))
        put("1CO.5.7", listOf("ISA.53.7", "JHN.1.29", "1PE.1.19"))
        put("1CO.6.11", listOf("TIT.3.5", "HEB.10.22"))
        put("1CO.6.19", listOf("1CO.3.16", "2CO.6.16"))
        put("1CO.10.13", listOf("PSA.34.19", "ISA.63.9"))
        put("1CO.11.23", listOf("MAT.26.26", "MAR.14.22", "LUK.22.19"))
        put("1CO.13.1", listOf("1PE.4.8"))
        put("1CO.13.12", listOf("2CO.3.18", "1JN.3.2"))
        put("1CO.15.3", listOf("ISA.53.5", "GAL.1.4", "1PE.2.24"))
        put("1CO.15.10", listOf("2CO.11.5", "EPH.3.7"))
        put("1CO.15.21", listOf("ROM.5.12"))
        put("1CO.15.22", listOf("ROM.5.14"))
        put("1CO.15.25", listOf("PSA.110.1", "ACT.2.34"))
        put("1CO.15.42", listOf("DAN.12.3", "MAT.13.43", "PHP.3.21"))
        put("1CO.15.45", listOf("GEN.2.7"))
        put("1CO.15.51", listOf("1TH.4.14", "PHP.3.21"))
        put("1CO.15.55", listOf("HOS.13.14", "HEB.2.14"))

        // ===== 2 Corinthians =====
        put("2CO.1.3", listOf("1PE.1.3", "EPH.1.3"))
        put("2CO.4.4", listOf("JHN.12.31", "MAT.13.19", "1JN.5.19"))
        put("2CO.4.6", listOf("GEN.1.3", "1PE.2.9"))
        put("2CO.5.7", listOf("ROM.8.24", "HEB.11.1"))
        put("2CO.5.17", listOf("ISA.65.17", "EPH.2.10"))
        put("2CO.5.21", listOf("ISA.53.6", "ROM.8.3", "GAL.3.13", "1PE.2.24"))
        put("2CO.12.9", listOf("PSA.84.5", "ISA.40.29", "PHI.4.13"))

        // ===== Galatians =====
        put("GAL.2.20", listOf("ROM.6.6", "JHN.3.16", "1PE.4.2"))
        put("GAL.3.6", listOf("GEN.15.6", "ROM.4.3", "JAM.2.23"))
        put("GAL.3.13", listOf("DEU.21.23", "ROM.8.3", "2CO.5.21"))
        put("GAL.3.26", listOf("JHN.1.12", "ROM.8.16"))
        put("GAL.3.28", listOf("JHN.17.21", "ROM.10.12", "EPH.2.14"))
        put("GAL.4.4", listOf("GEN.3.15", "JHN.1.14", "ROM.1.3"))
        put("GAL.5.16", listOf("ROM.8.1", "ROM.13.14", "1PE.2.11"))
        put("GAL.5.22", listOf("JHN.15.5", "EPH.5.9"))
        put("GAL.6.7", listOf("JOB.4.8", "HOS.10.12", "ROM.2.6"))
        put("GAL.6.9", listOf("HEB.12.3", "LUK.18.1"))

        // ===== Ephesians =====
        put("EPH.1.4", listOf("ROM.8.29", "1PE.1.2"))
        put("EPH.1.7", listOf("ROM.3.24", "COL.1.14"))
        put("EPH.2.4", listOf("ROM.5.8", "1JN.3.1"))
        put("EPH.2.8", listOf("ROM.4.16", "TIT.3.5"))
        put("EPH.2.9", listOf("ROM.3.20", "ROM.11.6", "2TI.1.9"))
        put("EPH.2.10", listOf("2CO.5.17"))
        put("EPH.2.19", listOf("PHP.3.20", "HEB.12.22"))
        put("EPH.3.17", listOf("JHN.14.23", "COL.1.27"))
        put("EPH.4.8", listOf("PSA.68.18", "COL.2.15"))
        put("EPH.4.30", listOf("ISA.63.10", "1TH.5.19"))
        put("EPH.5.2", listOf("EXO.29.18", "LEV.1.9", "HEB.10.10"))
        put("EPH.5.25", listOf("COL.3.19", "1PE.3.7"))
        put("EPH.6.10", listOf("JOS.1.6", "JHN.15.5", "2TI.2.1"))
        put("EPH.6.11", listOf("LUK.14.31", "JAM.4.7", "1PE.5.8"))

        // ===== Philippians =====
        put("PHI.1.6", listOf("JHN.10.28", "JHN.15.5"))
        put("PHI.1.21", listOf("2CO.5.8"))
        put("PHI.2.5", listOf("JHN.13.15", "1PE.2.21"))
        put("PHI.2.6", listOf("JHN.1.1", "HEB.1.3"))
        put("PHI.2.7", listOf("ISA.53.3", "JHN.13.5"))
        put("PHI.2.8", listOf("HEB.5.8", "MAT.26.39"))
        put("PHI.2.9", listOf("PSA.72.17", "HEB.1.4"))
        put("PHI.2.10", listOf("ISA.45.23", "ROM.14.11"))
        put("PHI.3.9", listOf("ROM.3.21", "ROM.10.3"))
        put("PHI.3.10", listOf("ROM.6.4", "2CO.1.5"))
        put("PHI.3.14", listOf("1CO.9.24", "2TI.4.8"))
        put("PHI.3.20", listOf("HEB.12.22", "1PE.2.11"))
        put("PHI.4.7", listOf("JHN.14.27", "ISA.26.3"))
        put("PHI.4.13", listOf("2CO.12.9"))
        put("PHI.4.19", listOf("PSA.23.1", "PSA.84.11"))

        // ===== Colossians =====
        put("COL.1.15", listOf("JHN.14.9", "2CO.4.4", "HEB.1.3"))
        put("COL.1.16", listOf("JHN.1.3", "EPH.3.9", "HEB.1.2"))
        put("COL.1.18", listOf("1CO.15.20", "REV.1.5"))
        put("COL.1.19", listOf("JHN.1.14"))
        put("COL.1.20", listOf("EPH.2.16", "2CO.5.19"))
        put("COL.2.3", listOf("1CO.1.24", "ROM.8.32"))
        put("COL.2.9", listOf("JHN.1.14"))
        put("COL.2.14", listOf("EPH.2.15", "HEB.10.1"))
        put("COL.3.1", listOf("ROM.6.5", "EPH.2.6"))
        put("COL.3.2", listOf("MAT.6.21", "PHP.3.20"))

        // ===== Hebrews =====
        put("HEB.1.1", listOf("LUK.24.27", "1PE.1.10"))
        put("HEB.1.2", listOf("JHN.1.17", "COL.1.15"))
        put("HEB.1.3", listOf("PSA.110.1", "2CO.4.4", "COL.1.15"))
        put("HEB.1.8", listOf("PSA.45.6"))
        put("HEB.2.3", listOf("MAT.22.5", "LUK.14.18"))
        put("HEB.2.14", listOf("JHN.1.14", "ROM.8.3", "PHI.2.7"))
        put("HEB.4.12", listOf("JER.23.29", "EPH.6.17"))
        put("HEB.4.14", listOf("HEB.7.26", "HEB.9.12"))
        put("HEB.4.16", listOf("EPH.2.18", "ROM.5.2"))
        put("HEB.5.8", listOf("MAT.26.39", "PHI.2.8"))
        put("HEB.7.25", listOf("ROM.8.34", "1JN.2.1"))
        put("HEB.9.22", listOf("LEV.17.11"))
        put("HEB.9.27", listOf("GEN.3.19", "ECC.3.20"))
        put("HEB.9.28", listOf("1PE.2.24"))
        put("HEB.10.12", listOf("PSA.110.1", "COL.3.1"))
        put("HEB.10.25", listOf("ACT.2.42", "1TH.5.11"))
        put("HEB.11.1", listOf("ROM.8.24", "2CO.4.18"))
        put("HEB.11.6", listOf("PSA.78.22", "JER.32.17"))
        put("HEB.12.1", listOf("ROM.6.12", "1CO.9.24"))
        put("HEB.12.2", listOf("PHI.1.6", "1PE.1.20"))
        put("HEB.12.6", listOf("PRO.3.11", "REV.3.19"))
        put("HEB.13.5", listOf("GEN.28.15", "DEU.31.6", "JOS.1.5", "MAT.28.20"))
        put("HEB.13.8", listOf("MAL.3.6", "JAM.1.17"))

        // ===== James =====
        put("JAM.1.2", listOf("MAT.5.11", "ROM.5.3", "1PE.4.13"))
        put("JAM.1.5", listOf("PRO.2.3", "LUK.11.9", "JHN.14.13"))
        put("JAM.1.12", listOf("MAT.10.22", "2TI.4.8", "REV.2.10"))
        put("JAM.1.17", listOf("MAL.3.6", "ROM.11.29"))
        put("JAM.1.22", listOf("MAT.7.21", "ROM.2.13"))
        put("JAM.2.5", listOf("MAT.5.3", "LUK.6.20"))
        put("JAM.2.10", listOf("DEU.27.26", "GAL.3.10"))
        put("JAM.2.17", listOf("MAT.7.21", "TIT.1.16"))
        put("JAM.2.23", listOf("GEN.15.6", "ROM.4.3"))
        put("JAM.3.2", listOf("PRO.20.9", "ECC.7.20", "1JN.1.8"))
        put("JAM.4.7", listOf("EPH.6.11", "1PE.5.8"))
        put("JAM.5.14", listOf("MAR.6.13"))
        put("JAM.5.16", listOf("PRO.28.13", "1JN.1.9"))

        // ===== 1 Peter =====
        put("1PE.1.2", listOf("ROM.8.29", "EPH.1.4"))
        put("1PE.1.5", listOf("JHN.10.28"))
        put("1PE.1.7", listOf("PRO.17.3", "ZEC.13.9", "JAM.1.3"))
        put("1PE.1.18", listOf("1CO.6.20", "ISA.52.3"))
        put("1PE.1.19", listOf("ISA.53.7", "JHN.1.29", "HEB.9.14"))
        put("1PE.1.23", listOf("JHN.1.13", "JAM.1.18"))
        put("1PE.2.2", listOf("MAT.18.3", "JHN.3.3"))
        put("1PE.2.5", listOf("ROM.12.1", "EPH.2.22"))
        put("1PE.2.7", listOf("PSA.118.22", "MAT.21.42"))
        put("1PE.2.9", listOf("EXO.19.5", "DEU.10.15"))
        put("1PE.2.24", listOf("ISA.53.5", "HEB.9.28"))
        put("1PE.5.7", listOf("PSA.55.22", "MAT.6.25", "PHI.4.6"))
        put("1PE.5.8", listOf("JAM.4.7"))

        // ===== 2 Peter =====
        put("2PE.1.4", listOf("HEB.12.10", "1JN.3.2"))
        put("2PE.1.21", listOf("2TI.3.16", "1PE.1.11"))
        put("2PE.3.9", listOf("HAB.2.3", "MAT.24.35"))

        // ===== 1 John =====
        put("1JN.1.7", listOf("EPH.1.7", "REV.1.5"))
        put("1JN.1.9", listOf("PRO.28.13", "PSA.32.5"))
        put("1JN.2.1", listOf("ROM.8.34", "HEB.7.25"))
        put("1JN.3.2", listOf("ROM.8.29", "PHP.3.21"))
        put("1JN.3.8", listOf("GEN.3.15", "HEB.2.14"))
        put("1JN.4.4", listOf("ROM.8.31", "JHN.16.33"))
        put("1JN.4.8", listOf("1TI.6.16"))
        put("1JN.4.9", listOf("JHN.3.16", "ROM.5.8"))
        put("1JN.5.7", listOf("MAT.28.19"))
        put("1JN.5.14", listOf("JHN.14.13", "JAM.1.5"))

        // ===== Revelation =====
        put("REV.1.5", listOf("HEB.9.14", "1JN.1.7"))
        put("REV.1.7", listOf("MAT.24.30", "MAT.26.64", "DAN.7.13", "ZEC.12.10"))
        put("REV.1.8", listOf("ISA.41.4", "ISA.44.6", "REV.21.6"))
        put("REV.3.20", listOf("LUK.12.36", "JHN.14.23"))
        put("REV.5.5", listOf("GEN.49.9", "ISA.11.1", "HEB.7.14"))
        put("REV.5.9", listOf("ACT.20.28", "1CO.6.20", "1PE.1.19"))
        put("REV.7.17", listOf("PSA.23.1", "ISA.25.8"))
        put("REV.11.15", listOf("PSA.22.28", "DAN.7.14"))
        put("REV.12.9", listOf("GEN.3.1", "2CO.11.3"))
        put("REV.14.13", listOf("1TH.4.14", "HEB.4.9"))
        put("REV.19.13", listOf("JHN.1.1"))
        put("REV.19.16", listOf("1TI.6.15"))
        put("REV.20.12", listOf("DAN.7.10", "ROM.2.16"))
        put("REV.21.1", listOf("ISA.65.17", "2PE.3.13"))
        put("REV.21.4", listOf("ISA.25.8", "1CO.15.26"))
        put("REV.21.6", listOf("JHN.4.14", "REV.1.8"))
        put("REV.22.17", listOf("ISA.55.1", "JHN.7.37"))
        put("REV.22.20", listOf("ACT.1.11", "1CO.16.22"))
    }

    private val bookNames = mapOf(
        "gen" to "GEN", "exo" to "EXO", "lev" to "LEV", "num" to "NUM",
        "deu" to "DEU", "jos" to "JOS", "jdg" to "JDG", "rut" to "RUT",
        "1sa" to "1SA", "2sa" to "2SA", "1ki" to "1KI", "2ki" to "2KI",
        "1ch" to "1CH", "2ch" to "2CH", "ezr" to "EZR", "neh" to "NEH",
        "est" to "EST", "job" to "JOB", "psa" to "PSA", "pro" to "PRO",
        "ecc" to "ECC", "sng" to "SNG", "isa" to "ISA", "jer" to "JER",
        "lam" to "LAM", "eze" to "EZE", "dan" to "DAN", "hos" to "HOS",
        "jol" to "JOL", "amo" to "AMO", "oba" to "OBA", "jon" to "JON",
        "mic" to "MIC", "nam" to "NAM", "hab" to "HAB", "zep" to "ZEP",
        "hag" to "HAG", "zec" to "ZEC", "mal" to "MAL",
        "mat" to "MAT", "mar" to "MAR", "luk" to "LUK", "jhn" to "JHN",
        "act" to "ACT", "rom" to "ROM", "1co" to "1CO", "2co" to "2CO",
        "gal" to "GAL", "eph" to "EPH", "php" to "PHP", "phi" to "PHI",
        "col" to "COL", "1th" to "1TH", "2th" to "2TH", "1ti" to "1TI",
        "2ti" to "2TI", "tit" to "TIT", "phm" to "PHM", "heb" to "HEB",
        "jam" to "JAM", "1pe" to "1PE", "2pe" to "2PE", "1jn" to "1JN",
        "2jn" to "2JN", "3jn" to "3JN", "jud" to "JUD", "rev" to "REV"
    )

    /**
     * 获取某节经文的交叉引用
     */
    fun getCrossRefs(book: String, chapter: Int, verse: Int): List<String> {
        val bookKey = bookNames[book.lowercase()] ?: book.uppercase()
        val key = "$bookKey.$chapter.$verse"
        return data[key] ?: emptyList()
    }
}