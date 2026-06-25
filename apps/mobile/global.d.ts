// mobile global 类型补丁
// RN 不带 node 类型，但常用 process / __DEV__

declare const process: {
  env: { [key: string]: string | undefined };
  platform?: string;
};

declare const __DEV__: boolean;
