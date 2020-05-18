import { describe, test } from 'gateware-ts/testware';
import {
  ADDI,
  ANDI,
  ORI,
  XORI,
  ADD,
  AND,
  OR,
  XOR,
  SLT,
  SLTI,
  SLTUI,
  SLTU,
  SLLI,
  SLL,
  SRLI,
  SRL,
  SRAI,
  SRA,
  SUB
} from '../instructions/index';
import {
  GWModule,
  Signal,
  Edge,
  Not,
  edge,
  CodeGenerator,
  nanoseconds,
  picoseconds,
  Signedness,
  SubmodulePath,
  Constant,
  Port,
} from 'gateware-ts';
import { toSignedBinary, Binary, toUnsignedBinary } from '../util';
import {CPU} from '../index';

class Test extends GWModule {
  instruction = this.input(Signal(32));
  clk = this.input(Signal());
  rst = this.input(Signal());
  enable = this.input(Signal());

  constructor() {
    super();

    // Programatically create all the regiser output signals
    Array.from({length: 32}, (_, i) => {
      this.createOutput(`x${i}`, Signal(32))
    });
  }

  describe() {
    const cpu = new CPU();
    this.addSubmodule(cpu, 'uut', {
      inputs: {
        instruction: this.instruction,
        clk: this.clk,
        rst: this.rst,
        enable: this.enable,
      },
      // Programatically assign all the CPUs register outputs to the modules register outputs
      outputs: Array.from({length: 32}).reduce<{[output:string]: Port[]}>((op, _, i) => {
        op[`register_x${i}`] = [this[`x${i}`]];
        return op;
      }, {})
    });

    this.simulation.everyTimescale(5, [ this.clk ['='] (Not(this.clk)) ]);
    const pulse = edge(Edge.Positive, this.clk);

    const x = Array.from({length:32}, (_, i) => i);
    const rd1 = x[8];
    const rd2 = x[9];
    const rd3 = x[10];
    const rd1Path = `uut.x8.data`;
    const rd2Path = `uut.x9.data`;
    const rd3Path = `uut.x10.data`;

    const regPath = i => `uut.x${i}.data`;
    const setRegister = (i, val) => SubmodulePath(regPath(i)).setTo(val);
    const getRegister = (i) => SubmodulePath(regPath(i));
    const reg  = i => x[i];

    const immTest = (name, instCstr, opFn) => test(name, expect => {
      const r1 = toSignedBinary(0x101).signExtend(32);
      const r2 = toSignedBinary(0x202).signExtend(32);
      const r3 = toSignedBinary(-10).signExtend(32);

      const i1 = toSignedBinary(0x200).signExtend(12);
      const i2 = toSignedBinary(0x123).signExtend(12);
      const i3 = toSignedBinary(10).signExtend(12);

      return [
        // Set up some register values
        setRegister(1, r1.toNumber()),
        setRegister(2, r2.toNumber()),
        setRegister(3, r3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), i1.toNumber(), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), i2.toNumber(), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), i3.toNumber(), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1, i1.signExtend(32)))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r2, i2.signExtend(32)))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r3, i3.signExtend(32)))), ''),
      ];
    });

    const regTest = (name, instCstr, opFn) => test(name, expect => {
      const r1_1 = toSignedBinary(0x101).signExtend(32);
      const r1_2 = toSignedBinary(0x202).signExtend(32);
      const r1_3 = toSignedBinary(-10).signExtend(32);

      const r2_1 = toSignedBinary(0x200).signExtend(32);
      const r2_2 = toSignedBinary(0x123).signExtend(32);
      const r2_3 = toSignedBinary(10).signExtend(32);

      return [
        // Set up some register values
        setRegister(1, r1_1.toNumber()),
        setRegister(2, r1_2.toNumber()),
        setRegister(3, r1_3.toNumber()),
        setRegister(4, r2_1.toNumber()),
        setRegister(5, r2_2.toNumber()),
        setRegister(6, r2_3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), reg(4), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), reg(5), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), reg(6), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1_1, r2_1))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r1_2, r2_2))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r1_3, r2_3))), ''),
      ];
    });

    const shiftImmTest = (name, instCstr, opFn) => test(name, expect => {
      const r1 = toUnsignedBinary(0x101).zeroExtend(32);
      const r2 = toUnsignedBinary(0x202).zeroExtend(32);
      const r3 = toUnsignedBinary(0xdeadbeef).zeroExtend(32);

      const i1 = toUnsignedBinary(2).zeroExtend(5);
      const i2 = toUnsignedBinary(10).zeroExtend(5);
      const i3 = toUnsignedBinary(31);

      return [
        // Set up some register values
        setRegister(1, r1.toNumber()),
        setRegister(2, r2.toNumber()),
        setRegister(3, r3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), i1.toNumber(), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), i2.toNumber(), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), i3.toNumber(), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1, i1))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r2, i2))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r3, i3))), ''),
      ];
    });

    const shiftRegTest = (name, instCstr, opFn) => test(name, expect => {
      const r1_1 = toUnsignedBinary(0x101).zeroExtend(32);
      const r1_2 = toUnsignedBinary(0x202).zeroExtend(32);
      const r1_3 = toUnsignedBinary(0xdeadbeef).zeroExtend(32);
      const r2_1 = toUnsignedBinary(1).zeroExtend(32);
      const r2_2 = toUnsignedBinary(10).zeroExtend(32);
      const r2_3 = toUnsignedBinary(31).zeroExtend(32);

      return [
        // Set up some register values
        setRegister(1, r1_1.toNumber()),
        setRegister(2, r1_2.toNumber()),
        setRegister(3, r1_3.toNumber()),
        setRegister(4, r2_1.toNumber()),
        setRegister(5, r2_2.toNumber()),
        setRegister(6, r2_3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), reg(4), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), reg(5), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), reg(6), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1_1, r2_1))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r1_2, r2_2))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r1_3, r2_3))), ''),
      ];
    });

    const bOp = fn => (...args) => fn(...args).toNumber();

    this.simulation.run(describe('ALU Integration', [
      test('[setup]', () => [
        this.enable ['='] (1)
      ]),
      immTest('ADDI', ADDI, bOp(Binary.add)),
      immTest('ANDI', ANDI, bOp(Binary.and)),
      immTest('ORI',  ORI,  bOp(Binary.or)),
      immTest('XORI', XORI, bOp(Binary.xor)),
      immTest('SLTI', SLTI, bOp(Binary.lessThanSigned)),
      immTest('SLTUI', SLTUI, bOp(Binary.lessThan)),
      shiftImmTest('SLLI', SLLI, bOp(Binary.shiftLeft)),
      shiftImmTest('SRLI', SRLI, bOp(Binary.shiftRight)),
      shiftImmTest('SRAI', SRAI, bOp(Binary.shiftRightArithmetic)),

      regTest('ADD', ADD, bOp(Binary.add)),
      regTest('SUB', SUB, bOp(Binary.sub)),
      regTest('AND', AND, bOp(Binary.and)),
      regTest('OR',  OR,  bOp(Binary.or)),
      regTest('XOR', XOR, bOp(Binary.xor)),
      regTest('SLT', SLT, bOp(Binary.lessThanSigned)),
      regTest('SLTU', SLTU, bOp(Binary.lessThan)),
      shiftRegTest('SLL', SLL, bOp(Binary.shiftLeft)),
      shiftRegTest('SRL', SRL, bOp(Binary.shiftRight)),
      shiftRegTest('SRA', SRA, bOp(Binary.shiftRightArithmetic)),

      test('x0 is non-writable', expect => {
        return [
          this.instruction ['='] (ADDI(reg(0), 0x01, reg(0))),
          pulse,
          pulse,
          expect(getRegister(0) ['=='] (0), '')
        ];
      }),
    ]));
  }
}

const cg = new CodeGenerator(new Test(), {
  simulation: {
    enabled: true,
    timescale: [ nanoseconds(1), picoseconds(10) ]
  }
});

cg.runSimulation('integration', 'integration.vcd', true);
