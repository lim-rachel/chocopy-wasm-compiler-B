
import {Stmt, Expr, Type, NUM, BOOL, NONE, CLASS, UniOp, BinOp, Literal, Program, FunDef, VarInit} from './ast';

// I ❤️ TypeScript: https://github.com/microsoft/TypeScript/issues/13965
export class TypeCheckError extends Error {
   __proto__: Error
   constructor(message?: string) {
    const trueProto = new.target.prototype;
    super(message);

    // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
    this.__proto__ = trueProto;
  } 
}

export type GlobalTypeEnv = {
  globals: Map<string, Type>,
  functions: Map<string, [Array<Type>, Type]>
}

export type LocalTypeEnv = {
  vars: Map<string, Type>,
  expectedRet: Type
}

export function emptyGlobalTypeEnv() : GlobalTypeEnv {
  return {
    globals: new Map(),
    functions: new Map()
  };
}

export function emptyLocalTypeEnv() : LocalTypeEnv {
  return {
    vars: new Map(),
    expectedRet: NONE
  };
}

export type TypeError = {
  message: string
}

export function isSubtype(env : GlobalTypeEnv, t1 : Type, t2 : Type) : boolean {
  if(t1 === t2) { return true; }
  if(t2.tag === "class") { return true; }
  return false;
}

export function isAssignable(env : GlobalTypeEnv, t1 : Type, t2 : Type) : boolean {
  return isSubtype(env, t1, t2);
}

export function join(env : GlobalTypeEnv, t1 : Type, t2 : Type) : Type {
  return NONE
}

export function augmentTEnv(env : GlobalTypeEnv, program : Program<null>) : GlobalTypeEnv {
  const newGlobs = new Map(env.globals);
  const newFuns = new Map(env.functions);
  program.inits.forEach(init => newGlobs.set(init.name, tcInit(init).type));
  program.funs.forEach(fun => newFuns.set(fun.name, [fun.parameters.map(p => p.type), fun.ret]));
  return { globals: newGlobs, functions: newFuns };
}

export function tc(env : GlobalTypeEnv, program : Program<null>) : [Program<Type>, GlobalTypeEnv] {
  const locals = emptyLocalTypeEnv();
  const newEnv = augmentTEnv(env, program);
  const tDefs = program.funs.map(fun => tcDef(newEnv, fun));

  // program.inits.forEach(init => env.globals.set(init.name, tcInit(init)));
  // program.funs.forEach(fun => env.functions.set(fun.name, [fun.parameters.map(p => p.type), fun.ret]));
  // program.funs.forEach(fun => tcDef(env, fun));
  // Strategy here is to allow tcBlock to populate the locals, then copy to the
  // global env afterwards (tcBlock changes locals)
  const tBody = tcBlock(newEnv, locals, program.stmts);
  const lastTyp = tBody[tBody.length - 1].a;
  // TODO(joe): check for assignment in existing env vs. new declaration
  // and look for assignment consistency
  for (let name of locals.vars.keys()) {
    newEnv.globals.set(name, locals.vars.get(name));
  }
  const aprogram = {...program, a: lastTyp, stmts: tBody, funs: tDefs};
  return [aprogram, newEnv];
}

export function tcInit(init : VarInit<null>) : VarInit<Type> {
  const valTyp = tcLiteral(init.value);
  if (init.type === valTyp) {
    return init;
  } else {
    throw new TypeCheckError("Expected type `" + init.type + "`; got type `" + valTyp + "`");
  }
}

export function tcDef(env : GlobalTypeEnv, fun : FunDef<null>) : FunDef<Type> {
  var locals = emptyLocalTypeEnv();
  locals.expectedRet = fun.ret;
  fun.parameters.forEach(p => locals.vars.set(p.name, p.type));
  fun.inits.forEach(init => locals.vars.set(init.name, tcInit(init).type));
  
  const tBody = tcBlock(env, locals, fun.body);
  const retTyp = tBody[tBody.length - 1].a;
  if (retTyp !== fun.ret) {
    throw new TypeCheckError("function " + fun.name + " has " + JSON.stringify(retTyp) + " return type; type" + JSON.stringify(fun.ret) + " expected");
  }
  return {...fun, body: tBody};
}

export function tcBlock(env : GlobalTypeEnv, locals : LocalTypeEnv, stmts : Array<Stmt<null>>) : Array<Stmt<Type>> {
  return stmts.map(stmt => tcStmt(env, locals, stmt));
}

export function tcStmt(env : GlobalTypeEnv, locals : LocalTypeEnv, stmt : Stmt<null>) : Stmt<Type> {
  switch(stmt.tag) {
    case "assign":
      const tValExpr = tcExpr(env, locals, stmt.value);
      var nameTyp;
      if (locals.vars.has(stmt.name)) {
        nameTyp = locals.vars.get(stmt.name);
      } else if (env.globals.has(stmt.name)) {
        nameTyp = env.globals.get(stmt.name);
      } else {
        throw new TypeCheckError("Unbound id: " + stmt.name);
      }
      if(!isAssignable(env, tValExpr.a, nameTyp)) {
        throw new TypeCheckError("Non-assignable types");
      }
      return {a: NONE, tag: stmt.tag, name: stmt.name, value: tValExpr};
    case "expr":
      const tExpr = tcExpr(env, locals, stmt.expr);
      return {a: tExpr.a, tag: stmt.tag, expr: tExpr};
    case "if":
      var tCond = tcExpr(env, locals, stmt.cond);
      const tThn = tcBlock(env, locals, stmt.thn);
      const thnTyp = tThn[tThn.length - 1].a;
      const tEls = tcBlock(env, locals, stmt.els);
      const elsTyp = tEls[tEls.length - 1].a;
      if (tCond.a !== BOOL) {
        throw new TypeCheckError("Condition Expression Must be a bool");
      } else if (thnTyp !== elsTyp) {
        throw new TypeCheckError("Types of then and else branches must match");
      } else{
        return {a: thnTyp, tag: stmt.tag, cond: tCond, thn: tThn, els: tEls};
      }
    case "return":
      const tRet = tcExpr(env, locals, stmt.value);
      if (tRet.a !== locals.expectedRet) {
        throw new TypeCheckError("expected return type `" + locals.expectedRet + "`; got type `" + tRet.a + "`");
      } else {
        return {a: tRet.a, tag: stmt.tag, value:tRet};
      }
    case "while":
      var tCond = tcExpr(env, locals, stmt.cond);
      const tBody = tcBlock(env, locals, stmt.body);
      if (tCond.a === BOOL) {
        return {a: NONE, tag:stmt.tag, cond: tCond, body: tBody};
      } else {
        throw new TypeCheckError("Condition Expression Must be a bool");
      }
    case "pass":
      return {a: NONE, tag: stmt.tag};
  }
}

export function tcExpr(env : GlobalTypeEnv, locals : LocalTypeEnv, expr : Expr<null>) : Expr<Type> {
  switch(expr.tag) {
    case "literal": 
      return {...expr, a: tcLiteral(expr.value)};
    case "binop":
      const tLeft = tcExpr(env, locals, expr.left);
      const tRight = tcExpr(env, locals, expr.right);
      const tBin = {...expr, left: tLeft, right: tRight};
      switch(expr.op) {
        case BinOp.Plus:
        case BinOp.Minus:
        case BinOp.Mul:
        case BinOp.IDiv:
        case BinOp.Mod:
          if(tLeft.a === NUM && tRight.a === NUM) { return {a: NUM, ...tBin}}
          else { throw new TypeCheckError("Type mismatch for numeric op" + expr.op); }
        case BinOp.Eq:
        case BinOp.Neq:
          if(tLeft.a === tRight.a) { return {a: BOOL, ...tBin} ; }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op)}
        case BinOp.Lte:
        case BinOp.Gte:
        case BinOp.Lt:
        case BinOp.Gt:
          if(tLeft.a === NUM && tRight.a === NUM) { return {a: BOOL, ...tBin} ; }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op) }
        case BinOp.And:
        case BinOp.Or:
          if(tLeft.a === BOOL && tRight.a === BOOL) { return {a: BOOL, ...tBin} ; }
          else { throw new TypeCheckError("Type mismatch for boolean op" + expr.op); }
        case BinOp.Is:
          throw new Error("is not implemented yet");
      }
    case "uniop":
      const tExpr = tcExpr(env, locals, expr.expr);
      const tUni = {...expr, a: tExpr.a, expr: tExpr}
      switch(expr.op) {
        case UniOp.Neg:
          if(tExpr.a === NUM) { return tUni }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op);}
        case UniOp.Not:
          if(tExpr.a === BOOL) { return tUni }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op);}
      }
    case "id":
      if (locals.vars.has(expr.name)) {
        return {a: locals.vars.get(expr.name), ...expr};
      } else if (env.globals.has(expr.name)) {
        return {a: env.globals.get(expr.name), ...expr};
      } else {
        throw new TypeCheckError("Unbound id: " + expr.name);
      }
    case "builtin1":
      if (expr.name === "print") {
        const tArg = tcExpr(env, locals, expr.arg);
        return {...expr, a: tArg.a, arg: tArg};
      } else if(env.functions.has(expr.name)) {
        const [[expectedArgTyp], retTyp] = env.functions.get(expr.name);
        const tArg = tcExpr(env, locals, expr.arg);
        
        if(expectedArgTyp === tArg.a) {
          return {...expr, a: retTyp, arg: tArg};
        } else {
          throw new TypeError("Function call type mismatch: " + expr.name);
        }
      } else {
        throw new TypeError("Undefined function: " + expr.name);
      }
    case "builtin2":
      if(env.functions.has(expr.name)) {
        const [[leftTyp, rightTyp], retTyp] = env.functions.get(expr.name);
        const tLeftArg = tcExpr(env, locals, expr.left);
        const tRightArg = tcExpr(env, locals, expr.right);
        if(tLeftArg.a === leftTyp && tRightArg.a === rightTyp) {
          return {...expr, a: retTyp, left: tLeftArg, right: tRightArg};
        } else {
          throw new TypeError("Function call type mismatch: " + expr.name);
        }
      } else {
        throw new TypeError("Undefined function: " + expr.name);
      }
    case "call":
      if(env.functions.has(expr.name)) {
        const [argTypes, retType] = env.functions.get(expr.name);
        const tArgs = expr.arguments.map(arg => tcExpr(env, locals, arg));

        if(argTypes.length === expr.arguments.length &&
           tArgs.every((tArg, i) => tArg.a === argTypes[i])) {
             return {...expr, a: retType, arguments: expr.arguments};
           } else {
            throw new TypeError("Function call type mismatch: " + expr.name);
           }
      } else {
        throw new TypeError("Undefined function: " + expr.name);
      }
    default: throw new TypeCheckError(`unimplemented type checking for expr: ${expr}`);
  }
}

export function tcLiteral(literal : Literal) {
    switch(literal.tag) {
        case "bool": return BOOL;
        case "num": return NUM;
    }
}