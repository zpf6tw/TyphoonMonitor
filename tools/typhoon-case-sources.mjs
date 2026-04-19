export const TYPHOON_CASE_SOURCES = [
    {
        id: '1',
        stormCode: 'ATSANI_2015',
        nameEn: 'ATSANI(2015)',
        nameZh: '\u827e\u838e\u5c3c(2015)',
        sourceType: 'csv_truth',
        csvPath: '../data/NameTime_Idx_BST_ibtracs_ATSANI.csv',
        sampleKeyPrefix: '2015_ATSANI_',
        startIsoTime: '2015081506',
        endIsoTime: '2015082421',
        legacyNameIncludes: ['atsani'],
    },
];

/*
To add a new storm, append one object:
{
    id: '3',
    stormCode: 'MICHAUNG_2023',
    nameEn: 'MICHAUNG(2023)',
    nameZh: '<ChineseName>(2023)',
    sourceType: 'csv_truth',
    csvPath: '../data/NameTime_Idx_BST_ibtracs_MICHAUNG.csv',
    sampleKeyPrefix: '2023_MICHAUNG_',
    startIsoTime: '2023120100',
    endIsoTime: '2023120600',
    legacyNameIncludes: ['michaung'],
}
*/
