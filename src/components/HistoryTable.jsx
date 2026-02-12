import React from 'react';

const HistoryTable = ({ historyData, selectedDate, timeFilter, strikeCount }) => {
    const findClosestStrike = (price, step = 50) => {
        return Math.round(price / step) * step;
    };

    // 1. Initial processing (Oldest to Newest)
    let historyToProcess = [...historyData];

    // 2. Date Filter
    if (selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

        historyToProcess = historyToProcess.filter(snapshot => {
            const snapshotTime = new Date(snapshot.timestamp);
            return snapshotTime >= startOfDay && snapshotTime <= endOfDay;
        });
    }

    // 3. Time Filter
    if (timeFilter && timeFilter !== 'all') {
        const now = new Date();
        const todayYear = now.getFullYear();
        const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
        const todayDay = String(now.getDate()).padStart(2, '0');
        const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

        const isPastDate = selectedDate && selectedDate !== todayStr;

        if (!isPastDate) {
            const hoursMap = { '1h': 1, '3h': 3, '6h': 6 };
            const hours = hoursMap[timeFilter] || 24;
            const cutoffTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

            historyToProcess = historyToProcess.filter(snapshot => {
                const snapshotTime = new Date(snapshot.timestamp);
                return snapshotTime >= cutoffTime;
            });
        }
    }

    // 4. Strike-based Deduplication (same as SnapshotTable)
    let finalFiltered = [];
    if (historyToProcess.length > 0) {
        historyToProcess.forEach((currSnapshot) => {
            if (finalFiltered.length === 0) {
                finalFiltered.push(currSnapshot);
                return;
            }

            const prevSnapshot = finalFiltered[finalFiltered.length - 1];
            const spotPrice = currSnapshot.data?.records?.underlyingValue || 0;
            const atmStrike = findClosestStrike(spotPrice, 50);

            const range = (strikeCount - 1) / 2;
            const strikesToCheck = [];
            for (let i = -range; i <= range; i++) {
                strikesToCheck.push(atmStrike + (i * 50));
            }

            let hasOIChange = false;
            for (const strike of strikesToCheck) {
                const currRecord = currSnapshot.data?.records?.data?.find(r => r.strikePrice === strike);
                const prevRecord = prevSnapshot.data?.records?.data?.find(r => r.strikePrice === strike);

                if ((currRecord?.CE?.openInterest || 0) !== (prevRecord?.CE?.openInterest || 0) ||
                    (currRecord?.PE?.openInterest || 0) !== (prevRecord?.PE?.openInterest || 0)) {
                    hasOIChange = true;
                    break;
                }
            }

            if (hasOIChange) {
                finalFiltered.push(currSnapshot);
            }
        });
    }

    // 5. Final data extraction for display
    const processedData = finalFiltered.map((entry, index) => {
        const ceTotal = entry.data?.filtered?.CE?.totOI || 0;
        const peTotal = entry.data?.filtered?.PE?.totOI || 0;
        const pcr = ceTotal > 0 ? (peTotal / ceTotal).toFixed(2) : '0.00';

        // Find pre-deduplication predecessor in historyToProcess for change calculation
        // Or simply compare with the previous entry in finalFiltered (which is what user sees)
        const prevEntry = index > 0 ? finalFiltered[index - 1] : null;
        let ceDiff = 0;
        let peDiff = 0;

        if (prevEntry) {
            ceDiff = ceTotal - (prevEntry.data?.filtered?.CE?.totOI || 0);
            peDiff = peTotal - (prevEntry.data?.filtered?.PE?.totOI || 0);
        }

        return {
            timestamp: entry.timestamp,
            time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ceTotal,
            peTotal,
            pcr,
            ceDiff,
            peDiff
        };
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
