1. Keep full stack / tree documenting execution for debugging purposes
2. "Tasks" should also just be frames in the stack, so we can debug them just like functions
3. In the frame, don't just keep a reference to the function, data, etc., but also to the time index. This way, during debugging we can restore exactly the state of the tree at the time the function was executed.
4. Build a way to store the stack in postgresql
5. Think about a "meta-level" of stack, so for example when we're debugging or examining a function in the stack, we create a kind of new stack "to the right" of the (top-down) stack that accesses the first stack)
