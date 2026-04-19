export const TYPHOON_CASE_SOURCES = [
    {
        id: '1',
        stormCode: 'ATSANI_2015',
        nameEn: 'Typhoon ATSANI (2015)',
        nameZh: '\u53f0\u98ce\u201cATSANI\u201d\uff082015\uff09',
        sourceType: 'csv_truth',
        csvPath: '../data/NameTime_Idx_BST_ibtracs_ATSANI.csv',
        sampleKeyPrefix: '2015_ATSANI_',
        startIsoTime: '2015081506',
        endIsoTime: '2015082421',
        legacyNameIncludes: ['atsani'],
    },
    {
        id: '2',
        stormCode: 'BAVI_2020',
        nameEn: 'Typhoon BAVI (2020)',
        nameZh: '\u53f0\u98ce\u201cBAVI\u201d\uff082020\uff09',
        sourceType: 'csv_truth',
        csvPath: '../data/NameTime_Idx_BST_ibtracs_BAVI.csv',
        sampleKeyPrefix: '2020_BAVI_',
        startIsoTime: '2020082112',
        endIsoTime: '2020082709',
        legacyNameIncludes: ['bavi'],
    },
];

/*
To add a new storm, append one object:
{
    id: '3',
    stormCode: 'MICHAUNG_2023',
    nameEn: 'Typhoon MICHAUNG (2023)',
    nameZh: '\u53f0\u98ce\u201cMICHAUNG\u201d\uff082023\uff09',
    sourceType: 'csv_truth',
    csvPath: '../data/NameTime_Idx_BST_ibtracs_MICHAUNG.csv',
    sampleKeyPrefix: '2023_MICHAUNG_',
    startIsoTime: '2023120100',
    endIsoTime: '2023120600',
    legacyNameIncludes: ['michaung'],
}
*/
