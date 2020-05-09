import { Concat, Constant } from "gateware-ts";
import { Ops } from "../alu";

export const SLTI = (rs, imm, rd) => Concat([
  Constant(12, imm),
  Constant(5, rs),
  Ops.SLT,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const SLLI = (rs, shiftAmount, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, shiftAmount),
  Constant(5, rs),
  Ops.SLL,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const SRLI = (rs, shiftAmount, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, shiftAmount),
  Constant(5, rs),
  Ops.SR,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const SRAI = (rs, shiftAmount, rd) => Concat([
  Constant(7, 0b0100000),
  Constant(5, shiftAmount),
  Constant(5, rs),
  Ops.SR,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const SLTUI = (rs, imm, rd) => Concat([
  Constant(12, imm),
  Constant(5, rs),
  Ops.SLTU,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const ADDI = (rs, imm, rd) => Concat([
  Constant(12, imm),
  Constant(5, rs),
  Ops.ADD,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const ANDI = (rs, imm, rd) => Concat([
  Constant(12, imm),
  Constant(5, rs),
  Ops.AND,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const ORI = (rs, imm, rd) => Concat([
  Constant(12, imm),
  Constant(5, rs),
  Ops.OR,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const XORI = (rs, imm, rd) => Concat([
  Constant(12, imm),
  Constant(5, rs),
  Ops.XOR,
  Constant(5, rd),
  Constant(7, 0b0010011)
]);

export const ADD = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.ADD,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const SUB = (rs, rs2, rd) => Concat([
  Constant(7, 0b0100000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.ADD,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const AND = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.AND,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const OR = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.OR,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const XOR = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.XOR,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const SLT = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.SLT,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const SLTU = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.SLTU,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const SLL = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.SLL,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const SRL = (rs, rs2, rd) => Concat([
  Constant(7, 0b0000000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.SR,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);

export const SRA = (rs, rs2, rd) => Concat([
  Constant(7, 0b0100000),
  Constant(5, rs2),
  Constant(5, rs),
  Ops.SR,
  Constant(5, rd),
  Constant(7, 0b0110011)
]);
