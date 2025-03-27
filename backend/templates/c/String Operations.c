#include <stdio.h>
#include <string.h>

void print_string_info(const char* str)
{
    printf("String: '%s'\n", str);
    printf("Length: %zu\n", strlen(str));
}

int main(int argc, const char* argv[])
{
    // String initialization
    char str1[] = "Hello";
    char str2[] = "World";
    char result[50];
    
    // String copy
    strcpy(result, str1);
    print_string_info(result);
    
    // String concatenation
    strcat(result, " ");
    strcat(result, str2);
    print_string_info(result);
    
    // String comparison
    printf("\nComparing strings:\n");
    printf("str1 vs 'Hello': %d\n", strcmp(str1, "Hello"));
    printf("str1 vs str2: %d\n", strcmp(str1, str2));
    
    // String searching
    char* found = strstr(result, "World");
    if (found) {
        printf("\n'World' found at position: %zu\n", (size_t)(found - result));
    }
    
    // String tokenization
    char text[] = "C,Programming,Language";
    char* token = strtok(text, ",");
    
    printf("\nTokens:\n");
    while (token != NULL) {
        printf("- %s\n", token);
        token = strtok(NULL, ",");
    }
    
    return 0;
} 