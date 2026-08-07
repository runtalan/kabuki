export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  addedDate: Date;
}

export function generateMockWatchlist(): WatchlistItem[] {
  const now = new Date();
  return [
    {
      id: '1',
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      currentPrice: 142.35,
      previousClose: 138.92,
      dayChange: 3.43,
      dayChangePercent: 2.47,
      addedDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      ticker: 'META',
      name: 'Meta Platforms',
      currentPrice: 487.65,
      previousClose: 482.10,
      dayChange: 5.55,
      dayChangePercent: 1.15,
      addedDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      ticker: 'NFLX',
      name: 'Netflix Inc.',
      currentPrice: 283.45,
      previousClose: 287.20,
      dayChange: -3.75,
      dayChangePercent: -1.31,
      addedDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: '4',
      ticker: 'AMZN',
      name: 'Amazon.com Inc.',
      currentPrice: 178.92,
      previousClose: 175.45,
      dayChange: 3.47,
      dayChangePercent: 1.98,
      addedDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
    },
    {
      id: '5',
      ticker: 'QCOM',
      name: 'Qualcomm Inc.',
      currentPrice: 156.78,
      previousClose: 154.32,
      dayChange: 2.46,
      dayChangePercent: 1.59,
      addedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ];
}
