import { RunTimeError } from "./error_reporting";
import { sourceCode } from "./runner";

var runtimeStack: Array<number> = [];

export function assert_not_none(arg: any, line: number, col: number) : any {
    if (arg === 0){
      var message = stackTrace() + "\nRUNTIME ERROR: cannot perform operation on none in line " + line.toString() + " at column " + col.toString() + "\n\t" + splitString()[line-1].trim() + "\n\t" + '^'.repeat(splitString()[line-1].trim().length);
      throw new RunTimeError(message); 
    }
    return arg;
  }

export function division_by_zero(arg: number, line: number, col: number) : any {
    if (arg === 0) {
      var message = stackTrace() + "\nRUNTIME ERROR: division by zero in line " + line.toString() + " at column " + col.toString() + "\n\t" + splitString()[line-1].trim() + "\n\t" + '^'.repeat(splitString()[line-1].trim().length);
      throw new RunTimeError(message);
    }
    return arg;
}

export function index_out_of_bounds(length: any, index: any, line: number, col: number): any {
  if (index < 0) {
    if (index + length < 0) 
      throw new RunTimeError(stackTrace() + `\RUNTIME ERROR: Index ${index} out of bounds in line ${line} at column ${col}\n${splitString()[line-1].trim()}`);
    return index + length;
  }
  if (index >= length)
    throw new RunTimeError(stackTrace() + `\`RUNTIME ERROR: Index ${index} out of bounds in line ${line} at column ${col}\n${splitString()[line-1].trim()}`);
  return index;
}

function recursion_depth(line: number) {
  var message = stackTrace().split("\n").slice(0, 6).join("\n") + "\n[Previous line repeated 995 more times]\n\nRUNTIME ERROR: maximum recursion depth exceeded in line " + line.toString() + "\n\t" + splitString()[line-1].trim() + "\n\t" + '^'.repeat(splitString()[line-1].trim().length);
  throw new RunTimeError(message);
} 

export function stack_push(line: number) {
    if(runtimeStack.length > 1000) {
      recursion_depth(line);
    }
    runtimeStack.push(line);
} 

export function stack_clear() {
  runtimeStack = [];
} 

export function stackTrace() : string {
  var srcArray = splitString();
  var res = "Traceback (most recent call last): \n";
  runtimeStack.forEach(element => {
    res = res + "\tin line " + element.toString() + ": " + srcArray[element-1].trim() + " \n";
  });
  return res;
}

export function splitString() : Array<string> {
  return sourceCode.split("\n");
}