
                // push constant 7
                @7
                D=A
                @SP
                A=M
                M=D
                @SP
                M=M+1

                
                // push constant 8
                @8
                D=A
                @SP
                A=M
                M=D
                @SP
                M=M+1

                
                        // add
                        
            // put the value of *SP-1 to D and *SP-2 to M
            @SP
            M=M-1
            A=M
            D=M
            @SP
            M=M-1
            A=M
            

                        // the      actual add operation
                        D=D+M
                        
                        
            // and don't forget to put the value of the add (which is now stored in D) to the place in the stack where the first add operand was located
            @SP
            A=M
            M=D
            @SP
            M=M+1
                

                