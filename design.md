## Chocopy Compiler B
### Error Reporting 

For the Chocopy WASM Compiler B, we are implementing an interface for error reporting. Our plan for next week is to implement an interface for reporting the below errors which are being handled in the provided starter code. 

#### Types of Errors
The following is the list of errors, we plan on reporting for the next week
1. Compile-time Error
	- Parse Error
	- Reference Error
	- Type Error
2. Runtime Error

#### Error Reporting Format
The following is format of the error report, we plan on implementing for the next week
1. Type of error
2. Error message
3. Source location (line number)

####  AST  Changes
The following type has to be included in the ast.ts for keeping track of the source location to report the errors:
> export type SourceLocation = {line_number: number}

#### IR Changes
The **SourceLocation** defined in the ast.ts has to be imported in ir.ts as follows: 
> import {Type, BinOp, UniOp, Parameter, **SourceLocation**} from  './ast';

#### Test Cases
1.  Parse Error: Missing colon in variable initialization
```
x int = 3
```
> "Parse Error: Missing colon at line 1"

2.  Parse Error: Missing parenthesis in expression
```
x: int = 4

if (x == 6
	print (6)
```
> "Parse Error: Missing parenthesis at line 2"

3.  Parse Error: Undefined operator
```    
print (4 & 5)
```
> "Parse Error: Could not parse operator at line 1"

4.  Parse Error: Invalid syntax
```
x: int = 4
	
if (x == 4)::
	print(x)
```
> "Parse Error: Could not parse stmt at line 3"

5. Parse Error: Missing type annotation in function definition
```
def f(c):
	print(3)

f(2)
```
> "Parse Error: Missing type annotation for parameter c at line 1"

6.  Type Error: Type mismatch
```
x: int = 1
x = True
```
> "Type Error: bool type cannot be assigned to int type at line 2"  

7.  Type Error: Function call type mismatch
```    
def f(c: int):
	print(c)

f(2,3)
```
  > "Type Error: Function call type mismatch: f at line 1"

8.  Type Error: Variable not defined before accessing
```    
z = 1
```
> "Type Error: unbound id: z at line 1"

9.  Type Error: Function not defined before calling
```
def sum(a: int, b: int) -> int:
	return a + b

diff(5,7)
```
> "Type Error: Undefined function: diff at line 3"  

10. Type Error: Return type mismatch in a function definition
```
def f(c: int) -> int:
	return True

f(2)
```
> "Type Error: Expected return type int, got type bool at line 2"  

11. Runtime Error: Operation on none
```
class C(object):
	x: int = 0

c: C = None
c.x
```
> "Runtime Error: Cannot perform operation on none at line 5"

12. Runtime Error: Division by zero
```
x: int = 100//0
```
> "Runtime Error: Cannot divide by zero at line 1"