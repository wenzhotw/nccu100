// 替身：不出聲。
const AU = new Proxy({}, { get: () => () => {} });
export { AU };
