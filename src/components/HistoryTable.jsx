import React from 'react';

const HistoryTable = ({ historyData }) => {
    // Process historyData to extract Total CE OI, Total PE OI, and PCR
    const allData = historyData.map(entry => {
        const ceTotal = entry.data?.filtered?.CE?.totOI || 0;
        const peTotal = entry.data?.filtered?.PE?.totOI || 0;
        const pcr = ceTotal > 0 ? (peTotal / ceTotal).toFixed(2) : '0.00';

        return {
            timestamp: entry.timestamp,
            time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ceTotal,
            peTotal,
            pcr
        };
    });

    // Deduplicate and calculate differences
    const processedData = allData.filter((entry, index) => {
        if (index === 0) return true;
        const prev = allData[index - 1];
        return entry.ceTotal !== prev.ceTotal || entry.peTotal !== prev.peTotal;
    }).map((entry, index, filteredArray) => {
        // Find the index of this entry in the original allData
        const originalIndex = allData.findIndex(h => h.timestamp === entry.timestamp);

        let ceDiff = 0;
        let peDiff = 0;

        if (originalIndex > 0) {
            const prev = allData[originalIndex - 1];
            ceDiff = entry.ceTotal - prev.ceTotal;
            peDiff = entry.peTotal - prev.peTotal;
        }

        return { ...entry, ceDiff, peDiff };
    }).reverse(); // Latest first

    const formatDiff = (diff) => {
        if (diff === 0) return '-';
        const sign = diff > 0 ? '+' : '';
        return `${sign}${diff.toLocaleString()}`;
    };

    const getDiffColor = (diff) => {
        if (diff > 0) return 'text-green-600';
        if (diff < 0) return 'text-red-600';
        return 'text-gray-400';
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">OI History (Last {processedData.length} records)</h3>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total CE OI</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CE Change</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE OI</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PE Change</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PCR</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedData.map((row, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 font-mono">{row.time}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-red-600 font-semibold">{row.ceTotal.toLocaleString()}</td>
                                <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-bold ${getDiffColor(row.ceDiff)}`}>
                                    {formatDiff(row.ceDiff)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-teal-600 font-semibold">{row.peTotal.toLocaleString()}</td>
                                <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-bold ${getDiffColor(row.peDiff)}`}>
                                    {formatDiff(row.peDiff)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-bold">{row.pcr}</td>
                            </tr>
                        ))}
                        {processedData.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-gray-400">No history data available</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistoryTable;
