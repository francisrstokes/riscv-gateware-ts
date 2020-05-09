import { SignalLike, Ternary, assert, asUnsigned } from "gateware-ts";

/**
 * An intuitive form of ternary where the zero case is specified first and the one case after
 * @param selector
 * @param zeroOption
 * @param oneOption
 */
export const BitChoice = (selector:SignalLike, zeroOption:SignalLike, oneOption:SignalLike) => {
  if (selector.width !== 1) {
    throw new Error('Cannot create a BitChoice on selector whose width is not 1');
  }
  return Ternary(selector, oneOption, zeroOption);
};

export const toUnsignedBinary = (n:number) => {
  const nBits = Math.ceil(Math.log2(n + 1));
  const bits = Array.from({length: nBits}, () => 0);

  let num = n;
  for (let i = 0; i < nBits; i++) {
    const target = 2**(nBits-1-i);
    if (num >= target) {
      bits[i] = 1;
      num -= target;
    }
  }

  return new Binary(bits, false);
};

export const toSignedBinary = (n:number) => {
  const abs = Math.abs(n);
  const unsigned = [0, ...toUnsignedBinary(abs).getBits()];

  if (Math.sign(n) === 1) {
    return new Binary(unsigned, true);
  }

  const bits = (parseInt(unsigned
    .map(x => x == 1 ? 0 : 1)
    .map(x => x.toString())
    .join(''), 2) + 1)
    .toString(2)
    .split('')
    .map(Number);

  return new Binary(bits, true);
}

export class Binary {
  signed: boolean;
  value: number[];
  bits: number;

  constructor(value:number[], signed = false) {
    this.signed = signed;
    this.value = value;
    this.bits = this.value.length;
  }

  getBits() {
    return [...this.value];
  }

  signExtend(nBits) {
    const bitDiff = nBits - this.bits;

    if (bitDiff === 0) return new Binary(this.value, this.signed);
    if (bitDiff < 0) throw new Error('Cannot sign extend to a smaller number of bits');

    const newValue = [
      this.value[0],
      ...Array.from({length: bitDiff}, () => this.value[0]),
      ...this.value.slice(1)
    ];

    return new Binary(newValue, this.signed);
  }

  zeroExtend(nBits) {
    const bitDiff = nBits - this.bits;

    if (bitDiff === 0) return new Binary(this.value, this.signed);
    if (bitDiff < 0) throw new Error('Cannot zero extend to a smaller number of bits');

    const newValue = [
      ...Array.from({length: bitDiff}, () => 0),
      ...this.value
    ];

    return new Binary(newValue, this.signed);
  }

  static and(a:Binary, b:Binary) {
    return a.and(b);
  }

  static or(a:Binary, b:Binary) {
    return a.or(b);
  }

  static xor(a:Binary, b:Binary) {
    return a.xor(b);
  }

  static add(a:Binary, b:Binary) {
    return a.add(b);
  }

  static sub(a:Binary, b:Binary) {
    return a.sub(b);
  }

  static lessThan(a:Binary, b:Binary) {
    return a.lessThan(b);
  }

  static lessThanSigned(a:Binary, b:Binary) {
    return a.lessThanSigned(b);
  }

  static shiftLeft(a:Binary, b:Binary) {
    return a.shiftLeft(b);
  }

  static shiftRight(a:Binary, b:Binary) {
    return a.shiftRight(b);
  }

  static shiftRightArithmetic(a:Binary, b:Binary) {
    return a.shiftRightArithmetic(b);
  }

  add(b:Binary) {
    if (this.bits !== b.bits) {
      throw new Error('add: width mismatch');
    }

    let c = 0;
    const bBits = b.getBits().reverse();
    const newBits = this.getBits().reverse().map((bit, i) => {
      const res = bit + bBits[i] + c;
      if (res > 1) {
        c = 1;
        return res === 2 ? 0 : 1;
      } else {
        c = 0;
        return res;
      }
    });
    return new Binary(newBits.reverse(), this.signed);
  }

  sub(b:Binary) {
    if (this.bits !== b.bits) {
      throw new Error('sub: width mismatch');
    }

    let c = 0;
    const bBits = b.getBits().reverse();
    const aBits = this.getBits().reverse();

    const newBits = aBits.map((bitA, i) => {
      const bitB = bBits[i]
      const res = bitA - bitB - c;
      if (res < 0) {
        c = 1;
        return res === -2 ? 0 : 1;
      } else {
        c = 0;
        return res;
      }
    });
    return new Binary(newBits.reverse(), this.signed);
  }

  and(b:Binary) {
    if (this.bits !== b.bits) {
      throw new Error('and: width mismatch');
    }
    const bBits = b.getBits();
    const newBits = this.getBits().map((bit, i) => bit & bBits[i]);
    return new Binary(newBits, false);
  }

  or(b:Binary) {
    if (this.bits !== b.bits) {
      throw new Error('or: width mismatch');
    }
    const bBits = b.getBits();
    const newBits = this.getBits().map((bit, i) => bit | bBits[i]);
    return new Binary(newBits, false);
  }

  xor(b:Binary) {
    if (this.bits !== b.bits) {
      throw new Error('xor: width mismatch');
    }
    const bBits = b.getBits();
    const newBits = this.getBits().map((bit, i) => bit ^ bBits[i]);
    return new Binary(newBits, false);
  }

  lessThan(b:Binary) {
    if (this.bits !== b.bits) {
      throw new Error('lessThan: width mismatch');
    }
    return toUnsignedBinary((this.toNumber() < b.toNumber()) ? 1 : 0).zeroExtend(this.bits);
  }

  lessThanSigned(b:Binary) {
    if (this.bits !== b.bits) {
      throw new Error('lessThanSigned: width mismatch');
    }

    let retVal;

    if (b.value[0] === 1) {
      if (this.value[0] === 1) {
        // Both are negative, flip the comparrison
        retVal = (this.toNumber() > b.toNumber()) ? 1 : 0;
      } else {
        // b is negative, and a is positive
        retVal = 0;
      }
    } else {
      if (this.value[0] === 1) {
        // b is positive, but a is negative
        retVal = 1;
      } else {
        // b is positive, a is positive
        return this.lessThan(b);
      }
    }

    return toUnsignedBinary(retVal).zeroExtend(this.bits);
  }

  shiftLeft(b:Binary) {
    const amount = b.toNumber();
    const newBits = [
      ...this.value.slice(amount),
      ...Array.from({length: Math.min(amount, this.bits)}, () => 0)
    ];
    return new Binary(newBits, this.signed);
  }

  shiftRight(b:Binary) {
    const amount = b.toNumber();
    const newBits = [
      ...Array.from({length: Math.min(amount, this.bits)}, () => 0),
      ...this.value.slice(0, this.bits-amount),
    ];
    return new Binary(newBits, this.signed);
  }

  shiftRightArithmetic(b:Binary) {
    const amount = b.toNumber();
    const newBits = [
      ...Array.from({length: Math.min(amount, this.bits)}, () => this.value[0]),
      ...this.value.slice(0, this.bits-amount),
    ];
    return new Binary(newBits, this.signed);
  }

  toNumber() {
    return parseInt(this.value.join(''), 2);
  }

  toSignedNumber() {
    if (this.value[0] === 1) {
      return -(parseInt(this.value.slice(1).map(x => x === 1 ? '0' : '1').join(''), 2) + 1);
    }

    return this.toNumber();
  }

  toHexString() {
    const nNibbles = Math.floor(this.bits / 4);
    const bitsLeftOver = this.bits % 4;

    let str = '';
    for (let i = 0; i < this.bits - bitsLeftOver; i += 4) {
      str += parseInt(this.value.slice(i, i+4).join(''), 2).toString(16);
    }

    if (bitsLeftOver > 0) {
      str += parseInt(this.value.slice(nNibbles * 4).join(''), 2).toString(16);
    }

    return str;
  }
};
