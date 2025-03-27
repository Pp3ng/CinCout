#include <stdio.h>
#include <stdlib.h>

// Global variable in data segment
int global_var = 100;

// Constant in read-only segment
const int const_var = 200;

void print_addresses(void)
{
    // Stack variables
    int stack_var = 300;
    int stack_array[3] = {1, 2, 3};
    
    // Heap allocation
    int* heap_var = (int*)malloc(sizeof(int));
    *heap_var = 400;
    
    // Print addresses of different segments
    printf("Code segment:\n");
    printf("  Function address: %p\n", (void*)print_addresses);
    
    printf("\nData segment:\n");
    printf("  Global variable: %p\n", (void*)&global_var);
    printf("  Constant: %p\n", (void*)&const_var);
    
    printf("\nStack segment:\n");
    printf("  Local variable: %p\n", (void*)&stack_var);
    printf("  Array: %p\n", (void*)stack_array);
    
    printf("\nHeap segment:\n");
    printf("  Dynamic allocation: %p\n", (void*)heap_var);
    
    free(heap_var);
}

int main(int argc, const char* argv[])
{
    print_addresses();
    return 0;
} 