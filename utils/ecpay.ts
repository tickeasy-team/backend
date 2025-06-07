interface ECPayCheckMacValue {
  compare: (
    options: Record<string, string | number>,
    data: Record<string, string>
  ) => boolean;
  generate: (
    options: Record<string, string | number>,
    data: Record<string, string>
  ) => string;
}

export const getValidator = async () => {
  // 用 top-level await 匯入 CommonJS 套件
  const ecpayModule = await import('ecpay_aio_nodejs');

  // 重點：從 default 裡面取出 ecpay_check_mac_value
  const checkMac: ECPayCheckMacValue = (ecpayModule as any).ecpay_check_mac_value
    ?? (ecpayModule.default?.ecpay_check_mac_value as ECPayCheckMacValue);

  if (!checkMac || typeof checkMac.compare !== 'function') {
    throw new Error('❌ 無法正確取得 ecpay_check_mac_value');
  }

  const options = {
    MerchantID: '2000132',
    HashKey: '5294y06JbISpM5x9',
    HashIV: 'v77hoKGq4kWxNNIS',
    EncryptType: 1,
  };

  return (data: Record<string, string>) => checkMac.compare(options, data);
};
