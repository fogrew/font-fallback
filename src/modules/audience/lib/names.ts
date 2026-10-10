const NAMES: Record<string, string> = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  safari: 'Safari',
  edge: 'Edge',
  ie: 'Internet Explorer',
  ie_mob: 'IE Mobile',
  opera: 'Opera',
  op_mini: 'Opera Mini',
  op_mob: 'Opera Mobile',
  ios_saf: 'Safari on iOS',
  android: 'Android WebView',
  and_chr: 'Chrome for Android',
  and_ff: 'Firefox for Android',
  and_uc: 'UC Browser for Android',
  and_qq: 'QQ Browser for Android',
  samsung: 'Samsung Internet',
  baidu: 'Baidu Browser',
  kaios: 'KaiOS Browser',
  bb: 'BlackBerry Browser',
};

export function browserName(id: string): string {
  return NAMES[id] ?? id;
}
