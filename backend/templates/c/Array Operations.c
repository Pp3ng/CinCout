#include <stdio.h>
#include <stdlib.h>
#include <float.h>

void print_array(const int arr[], size_t size)
{
    printf("Array: [");
    for (size_t i = 0; i < size; i++) {
        printf("%d%s", arr[i], i < size - 1 ? ", " : "");
    }
    printf("]\n");
}

double calculate_average(const int arr[], size_t size)
{
    if (size == 0) return 0.0;
    
    long sum = 0;
    for (size_t i = 0; i < size; i++) {
        sum += arr[i];
    }
    return (double)sum / size;
}

int find_min(const int arr[], size_t size)
{
    if (size == 0) {
        fprintf(stderr, "Error: Empty array\n");
        exit(1);
    }
    
    int min = arr[0];
    for (size_t i = 1; i < size; i++) {
        if (arr[i] < min) min = arr[i];
    }
    return min;
}

int find_max(const int arr[], size_t size)
{
    if (size == 0) {
        fprintf(stderr, "Error: Empty array\n");
        exit(1);
    }
    
    int max = arr[0];
    for (size_t i = 1; i < size; i++) {
        if (arr[i] > max) max = arr[i];
    }
    return max;
}

int main(int argc, const char* argv[])
{
    int arr[] = {2, 4, 6, 8, 10, 12, 14, 16};
    size_t size = sizeof(arr) / sizeof(arr[0]);
    
    print_array(arr, size);
    
    double avg = calculate_average(arr, size);
    printf("Average: %.2f\n", avg);
    
    int min = find_min(arr, size);
    int max = find_max(arr, size);
    printf("Minimum: %d\n", min);
    printf("Maximum: %d\n", max);
    printf("Range: %d\n", max - min);
    
    return 0;
} 