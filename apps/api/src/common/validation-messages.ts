import type { ValidationOptions } from 'class-validator';

export function stringMessage(label: string): ValidationOptions {
  return { message: `${label}格式不正确` };
}

export function requiredMessage(label: string): ValidationOptions {
  return { message: `请输入${label}` };
}

export function emailMessage(label: string): ValidationOptions {
  return { message: `请输入有效的${label}` };
}

export function minLengthMessage(label: string, min: number, unit = '位'): ValidationOptions {
  return { message: `${label}长度不能少于 ${min} ${unit}` };
}

export function arrayMessage(label: string): ValidationOptions {
  return { message: `${label}格式不正确` };
}

export function objectMessage(label: string): ValidationOptions {
  return { message: `${label}格式不正确` };
}

export function numberMessage(label: string): ValidationOptions {
  return { message: `${label}格式不正确` };
}

export function booleanMessage(label: string): ValidationOptions {
  return { message: `${label}格式不正确` };
}
