#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>

void swap(int* a, int* b)
{
    int temp = *a;
    *a = *b;
    *b = temp;
}

void bubble_sort(int arr[], int n)
{
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(&arr[j], &arr[j + 1]);
            }
        }
    }
}

void insertion_sort(int arr[], int n)
{
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

void quick_sort_helper(int arr[], int low, int high)
{
    if (low < high) {
        int pivot = arr[high];
        int i = low - 1;
        
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                swap(&arr[i], &arr[j]);
            }
        }
        swap(&arr[i + 1], &arr[high]);
        
        int partition = i + 1;
        quick_sort_helper(arr, low, partition - 1);
        quick_sort_helper(arr, partition + 1, high);
    }
}

void quick_sort(int arr[], int n)
{
    quick_sort_helper(arr, 0, n - 1);
}

void print_array(const char* prefix, const int arr[], int n)
{
    printf("%s: ", prefix);
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");
}

double measure_time(void (*sort_func)(int[], int), int arr[], int n, const char* name)
{
    int* temp = (int*)malloc(n * sizeof(int));
    memcpy(temp, arr, n * sizeof(int));
    
    clock_t start = clock();
    sort_func(temp, n);
    clock_t end = clock();
    
    double time_spent = (double)(end - start) / CLOCKS_PER_SEC;
    printf("%s took %f seconds\n", name, time_spent);
    print_array(name, temp, n);
    
    free(temp);
    return time_spent;
}

int main(int argc, const char* argv[])
{
    srand(time(NULL));
    const int n = 100;
    int arr[100];
    
    // Generate random array
    for (int i = 0; i < n; i++) {
        arr[i] = rand() % 100;
    }
    print_array("Original array", arr, n);
    printf("\n");
    
    // Compare different sorting algorithms
    measure_time(bubble_sort, arr, n, "Bubble sort");
    printf("\n");
    measure_time(insertion_sort, arr, n, "Insertion sort");
    printf("\n");
    measure_time(quick_sort, arr, n, "Quick sort");
    
    return 0;
} 