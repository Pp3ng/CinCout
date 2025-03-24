const templates = {
    c: {
        "Hello World": `#include <stdio.h>

int main(int argc, const char* argv[])
{
    printf("Hello, World!\\n");
    return 0;
}`,
        "Recursive Fibonacci": `#include <stdio.h>

int fibonacci(int n)
{
    if (n <= 1)
        return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main(int argc, const char* argv[])
{
    int n = 21;
    printf("Fibonacci of %d is %d\\n", n, fibonacci(n));
    return 0;
}`,
        "Array Operations": `#include <stdio.h>
#include <stdlib.h>
#include <float.h>

void print_array(const int arr[], size_t size)
{
    printf("Array: [");
    for (size_t i = 0; i < size; i++) {
        printf("%d%s", arr[i], i < size - 1 ? ", " : "");
    }
    printf("]\\n");
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
        fprintf(stderr, "Error: Empty array\\n");
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
        fprintf(stderr, "Error: Empty array\\n");
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
    printf("Average: %.2f\\n", avg);
    
    int min = find_min(arr, size);
    int max = find_max(arr, size);
    printf("Minimum: %d\\n", min);
    printf("Maximum: %d\\n", max);
    printf("Range: %d\\n", max - min);
    
    return 0;
}`,
        "String Operations": `#include <stdio.h>
#include <string.h>

void print_string_info(const char* str)
{
    printf("String: '%s'\\n", str);
    printf("Length: %zu\\n", strlen(str));
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
    printf("\\nComparing strings:\\n");
    printf("str1 vs 'Hello': %d\\n", strcmp(str1, "Hello"));
    printf("str1 vs str2: %d\\n", strcmp(str1, str2));
    
    // String searching
    char* found = strstr(result, "World");
    if (found) {
        printf("\\n'World' found at position: %zu\\n", (size_t)(found - result));
    }
    
    // String tokenization
    char text[] = "C,Programming,Language";
    char* token = strtok(text, ",");
    
    printf("\\nTokens:\\n");
    while (token != NULL) {
        printf("- %s\\n", token);
        token = strtok(NULL, ",");
    }
    
    return 0;
}`,
        "Pthread Example": `#include <stdio.h>
#include <pthread.h>
#include <stdlib.h>
#include <unistd.h>

#define NUM_THREADS 3
#define NUM_INCREMENTS 1000000

long shared_counter = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

void* increment_counter(void* arg)
{
    int thread_id = *(int*)arg;
    
    for (int i = 0; i < NUM_INCREMENTS; i++) {
        pthread_mutex_lock(&mutex);
        shared_counter++;
        pthread_mutex_unlock(&mutex);
    }
    
    printf("Thread %d finished\\n", thread_id);
    return NULL;
}

int main(int argc, const char* argv[])
{
    pthread_t threads[NUM_THREADS];
    int thread_ids[NUM_THREADS];
    
    printf("Starting value: %ld\\n", shared_counter);
    
    // Create threads
    for (int i = 0; i < NUM_THREADS; i++) {
        thread_ids[i] = i;
        if (pthread_create(&threads[i], NULL, increment_counter, &thread_ids[i]) != 0) {
            perror("Thread creation failed");
            return 1;
        }
    }
    
    // Wait for all threads to complete
    for (int i = 0; i < NUM_THREADS; i++) {
        pthread_join(threads[i], NULL);
    }
    
    printf("Final value: %ld\\n", shared_counter);
    printf("Expected value: %ld\\n", (long)NUM_THREADS * NUM_INCREMENTS);
    
    pthread_mutex_destroy(&mutex);
    return 0;
}`,
        "Memory Layout": `#include <stdio.h>
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
    printf("Code segment:\\n");
    printf("  Function address: %p\\n", (void*)print_addresses);
    
    printf("\\nData segment:\\n");
    printf("  Global variable: %p\\n", (void*)&global_var);
    printf("  Constant: %p\\n", (void*)&const_var);
    
    printf("\\nStack segment:\\n");
    printf("  Local variable: %p\\n", (void*)&stack_var);
    printf("  Array: %p\\n", (void*)stack_array);
    
    printf("\\nHeap segment:\\n");
    printf("  Dynamic allocation: %p\\n", (void*)heap_var);
    
    free(heap_var);
}

int main(int argc, const char* argv[])
{
    print_addresses();
    return 0;
}`,
        "Sorting Algorithms": `#include <stdio.h>
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
    printf("\\n");
}

double measure_time(void (*sort_func)(int[], int), int arr[], int n, const char* name)
{
    int* temp = (int*)malloc(n * sizeof(int));
    memcpy(temp, arr, n * sizeof(int));
    
    clock_t start = clock();
    sort_func(temp, n);
    clock_t end = clock();
    
    double time_spent = (double)(end - start) / CLOCKS_PER_SEC;
    printf("%s took %f seconds\\n", name, time_spent);
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
    printf("\\n");
    
    // Compare different sorting algorithms
    measure_time(bubble_sort, arr, n, "Bubble sort");
    printf("\\n");
    measure_time(insertion_sort, arr, n, "Insertion sort");
    printf("\\n");
    measure_time(quick_sort, arr, n, "Quick sort");
    
    return 0;
}`,
        "Linked List": `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

struct Node* create_node(int data)
{
    struct Node* new_node = (struct Node*)malloc(sizeof(struct Node));
    if (new_node == NULL) {
        printf("Memory allocation failed!\\n");
        exit(1);
    }
    new_node->data = data;
    new_node->next = NULL;
    return new_node;
}

struct Node* insert_front(struct Node* head, int data)
{
    struct Node* new_node = create_node(data);
    new_node->next = head;
    return new_node;
}

void print_list(struct Node* head)
{
    struct Node* current = head;
    printf("List: ");
    while (current != NULL) {
        printf("%d -> ", current->data);
        current = current->next;
    }
    printf("NULL\\n");
}

void free_list(struct Node* head)
{
    struct Node* current = head;
    while (current != NULL) {
        struct Node* next = current->next;
        free(current);
        current = next;
    }
}

int main(int argc, const char* argv[])
{
    struct Node* head = NULL;
    
    head = insert_front(head, 30);
    head = insert_front(head, 20);
    head = insert_front(head, 10);
    
    print_list(head);
    free_list(head);
    
    return 0;
}`,
        "Binary Tree": `#include <stdio.h>
#include <stdlib.h>

struct TreeNode {
    int data;
    struct TreeNode* left;
    struct TreeNode* right;
};

struct TreeNode* create_node(int data)
{
    struct TreeNode* new_node = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    if (new_node == NULL) {
        printf("Memory allocation failed!\\n");
        exit(1);
    }
    new_node->data = data;
    new_node->left = NULL;
    new_node->right = NULL;
    return new_node;
}

void inorder_traversal(struct TreeNode* root)
{
    if (root != NULL) {
        inorder_traversal(root->left);
        printf("%d ", root->data);
        inorder_traversal(root->right);
    }
}

void preorder_traversal(struct TreeNode* root)
{
    if (root != NULL) {
        printf("%d ", root->data);
        preorder_traversal(root->left);
        preorder_traversal(root->right);
    }
}

void postorder_traversal(struct TreeNode* root)
{
    if (root != NULL) {
        postorder_traversal(root->left);
        postorder_traversal(root->right);
        printf("%d ", root->data);
    }
}

void free_tree(struct TreeNode* root)
{
    if (root != NULL) {
        free_tree(root->left);
        free_tree(root->right);
        free(root);
    }
}

int main(int argc, const char* argv[])
{
    struct TreeNode* root = create_node(1);
    root->left = create_node(2);
    root->right = create_node(3);
    root->left->left = create_node(4);
    root->left->right = create_node(5);
    
    printf("Inorder traversal: ");
    inorder_traversal(root);
    printf("\\n");
    
    printf("Preorder traversal: ");
    preorder_traversal(root);
    printf("\\n");
    
    printf("Postorder traversal: ");
    postorder_traversal(root);
    printf("\\n");
    
    free_tree(root);
    return 0;
}`,
        "Dijkstra Algorithm": `#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <stdbool.h>

// Number of vertices in the graph
#define V 9

// Find the vertex with minimum distance value
int find_min_distance(const int dist[], const bool visited[])
{
    int min = INT_MAX;
    int min_index = 0;
    
    for (int v = 0; v < V; v++) {
        if (!visited[v] && dist[v] < min) {
            min = dist[v];
            min_index = v;
        }
    }
    return min_index;
}

// Print shortest path distances
void print_distances(const int dist[])
{
    printf("Vertex      Distance\\n");
    printf("-------------------\\n");
    for (int i = 0; i < V; i++) {
        printf("%-6d      %d\\n", i, dist[i]);
    }
}

// Find shortest paths from source to all vertices
void dijkstra(const int graph[V][V], int src)
{
    int dist[V];     // Shortest distance from source
    bool visited[V]; // Track visited vertices
    
    // Initialize all distances as infinite
    for (int i = 0; i < V; i++) {
        dist[i] = INT_MAX;
        visited[i] = false;
    }
    
    // Distance to source is always 0
    dist[src] = 0;
    
    // Find shortest path for all vertices
    for (int count = 0; count < V - 1; count++) {
        int u = find_min_distance(dist, visited);
        visited[u] = true;
        
        // Update dist[] for adjacent vertices
        for (int v = 0; v < V; v++) {
            if (!visited[v] && graph[u][v] && 
                dist[u] != INT_MAX && 
                dist[u] + graph[u][v] < dist[v]) {
                dist[v] = dist[u] + graph[u][v];
            }
        }
    }
    
    print_distances(dist);
}

int main(int argc, const char* argv[])
{
    // Example graph represented as adjacency matrix
    int graph[V][V] = {
        {0, 4, 0, 0, 0, 0, 0, 8, 0},
        {4, 0, 8, 0, 0, 0, 0, 11, 0},
        {0, 8, 0, 7, 0, 4, 0, 0, 2},
        {0, 0, 7, 0, 9, 14, 0, 0, 0},
        {0, 0, 0, 9, 0, 10, 0, 0, 0},
        {0, 0, 4, 14, 10, 0, 2, 0, 0},
        {0, 0, 0, 0, 0, 2, 0, 1, 6},
        {8, 11, 0, 0, 0, 0, 1, 0, 7},
        {0, 0, 2, 0, 0, 0, 6, 7, 0}
    };
    
    printf("Finding shortest paths from vertex 0:\\n\\n");
    dijkstra(graph, 0);
    return 0;
}`
    },
    cpp: {
        "Hello World": `#include <iostream>

int main(int argc, const char* argv[])
{
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
        "Class with method": `#include <iostream>
#include <string>

class Person {
private:
    std::string name;
    int age;

public:
    Person(const std::string& n, int a) : name(n), age(a) {}

    void introduce() const
    {
        std::cout << "I am " << name << ", " << age << " years old." << std::endl;
    }
};

int main(int argc, const char* argv[])
{
    Person person("Alice", 25);
    person.introduce();
    return 0;
}`,

        "Virtual Function": `#include <iostream>
#include <vector>
#include <memory>

// Abstract base class demonstrating pure virtual functions
class Shape
{
public:
    virtual ~Shape() = default;  // Virtual destructor for proper cleanup
    
    // Pure virtual functions
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
    virtual void draw() const = 0;
    
    // Virtual function with default implementation
    virtual void scale(double factor)
    {
        std::cout << "Scaling shape by factor " << factor << "\\n";
    }
    
    // Non-virtual function
    void printInfo() const
    {
        std::cout << "Type: " << getType() << "\\n"
                  << "Area: " << area() << "\\n"
                  << "Perimeter: " << perimeter() << "\\n";
    }

protected:
    virtual std::string getType() const = 0;
};

class Circle : public Shape
{
public:
    explicit Circle(double r) : radius(r) {}
    
    double area() const override
    {
        return 3.14159 * radius * radius;
    }
    
    double perimeter() const override
    {
        return 2 * 3.14159 * radius;
    }
    
    void draw() const override
    {
        std::cout << "Drawing a circle with radius " << radius << "\\n";
    }
    
    void scale(double factor) override
    {
        Shape::scale(factor);  // Call base class implementation
        radius *= factor;
    }

protected:
    std::string getType() const override { return "Circle"; }

private:
    double radius;
};

class Rectangle : public Shape
{
public:
    Rectangle(double w, double h) : width(w), height(h) {}
    
    double area() const override
    {
        return width * height;
    }
    
    double perimeter() const override
    {
        return 2 * (width + height);
    }
    
    void draw() const override
    {
        std::cout << "Drawing a rectangle " << width << "x" << height << "\\n";
    }
    
    void scale(double factor) override
    {
        Shape::scale(factor);
        width *= factor;
        height *= factor;
    }

protected:
    std::string getType() const override { return "Rectangle"; }

private:
    double width;
    double height;
};

// Demonstrate polymorphic behavior
void processShape(const Shape& shape)
{
    shape.printInfo();
    shape.draw();
    std::cout << "---\\n";
}

int main(int argc, const char* argv[])
{
    // Using smart pointers for automatic memory management
    std::vector<std::unique_ptr<Shape>> shapes;
    
    // Create different shapes
    shapes.push_back(std::make_unique<Circle>(5.0));
    shapes.push_back(std::make_unique<Rectangle>(4.0, 6.0));
    
    // Demonstrate polymorphism
    std::cout << "=== Processing Shapes ===\\n";
    for (const auto& shape : shapes) {
        processShape(*shape);
    }
    
    // Demonstrate virtual function override
    std::cout << "\\n=== Scaling Shapes ===\\n";
    for (auto& shape : shapes) {
        shape->scale(2.0);
        shape->printInfo();
        std::cout << "---\\n";
    }
    
    return 0;
}`,
        "Smart Pointer": `#include <iostream>
#include <memory>
#include <vector>
#include <string>

class Animal
{
public:
    Animal(const std::string& name) : name_(name) 
    {
        std::cout << "Animal " << name_ << " created\\n";
    }
    
    virtual ~Animal() 
    {
        std::cout << "Animal " << name_ << " destroyed\\n";
    }
    
    virtual void makeSound() const = 0;
    std::string getName() const { return name_; }

protected:
    std::string name_;
};

// Derived classes
class Dog : public Animal
{
public:
    Dog(const std::string& name) : Animal(name) {}
    void makeSound() const override { std::cout << name_ << " says: Woof!\\n"; }
};

class Cat : public Animal {
public:
    Cat(const std::string& name) : Animal(name) {}
    void makeSound() const override { std::cout << name_ << " says: Meow!\\n"; }
};

// Custom deleter example
struct AnimalShelter {
    void operator()(Animal* animal) {
        std::cout << "Shelter releasing " << animal->getName() << "\\n";
        delete animal;
    }
};

int main()
{
    std::cout << "=== Smart Pointer Demonstrations ===\\n\\n";

    // unique_ptr demonstration
    std::cout << "1. std::unique_ptr (exclusive ownership):\\n";
    {
        auto dog = std::make_unique<Dog>("Buddy");
        dog->makeSound();
        
        // Won't compile - unique_ptr cannot be copied
        // auto dog2 = dog;
        
        // Transfer ownership
        auto new_owner = std::move(dog);
        new_owner->makeSound();
        
        std::cout << "Is original pointer empty? " << (dog == nullptr ? "Yes\\n" : "No\\n");
    }

    std::cout << "\\n2. std::shared_ptr (shared ownership):\\n";
    {
        auto cat1 = std::make_shared<Cat>("Whiskers");
        std::cout << "Reference count: " << cat1.use_count() << "\\n";
        
        {
            auto cat2 = cat1;  // Share ownership
            std::cout << "Reference count: " << cat1.use_count() << "\\n";
            cat2->makeSound();
        }
        
        std::cout << "After inner scope, reference count: " << cat1.use_count() << "\\n";
    }

    std::cout << "\\n3. std::weak_ptr (non-owning reference):\\n";
    {
        std::weak_ptr<Animal> weak_animal;
        {
            auto shared_dog = std::make_shared<Dog>("Max");
            weak_animal = shared_dog;
            
            if (auto temp = weak_animal.lock()) {
                std::cout << "Animal still exists: ";
                temp->makeSound();
            }
        }
        
        std::cout << "Is weak_ptr expired? " << (weak_animal.expired() ? "Yes\\n" : "No\\n");
    }

    std::cout << "\\n4. Custom deleter with smart pointer:\\n";
    {
        std::unique_ptr<Animal, AnimalShelter> shelter_animal(new Dog("Rocky"), AnimalShelter());
        shelter_animal->makeSound();
    }

    return 0;
}`,
        "Lambda Example": `#include <iostream>
#include <vector>
#include <algorithm>
#include <functional>
#include <string>

// Demonstrate basic lambda syntax
void basicLambda()
{
    std::cout << "=== Basic Lambda Syntax ===\\n";
    auto simpleLambda = []() { std::cout << "Hello from lambda!\\n"; };
    simpleLambda();

    // Lambda with parameters
    auto printNumber = [](int n) { std::cout << "Number: " << n << "\\n"; };
    printNumber(42);
}

// Demonstrate lambda captures
void captureLambda()
{
    std::cout << "\\n=== Lambda Captures ===\\n";
    int multiplier = 10;
    std::vector<int> numbers = {1, 2, 3, 4, 5};

    // Capture by value
    std::for_each(numbers.begin(), numbers.end(),
        [multiplier](int n) { std::cout << n * multiplier << " "; });
    std::cout << "\\n";

    // Capture by reference
    int sum = 0;
    std::for_each(numbers.begin(), numbers.end(),
        [&sum](int n) { sum += n; });
    std::cout << "Sum: " << sum << "\\n";

    // Mixed capture
    int evenCount = 0;
    auto printAndCount = [&evenCount, multiplier](int n) {
        if (n * multiplier % 2 == 0)
            evenCount++;
    };
    std::for_each(numbers.begin(), numbers.end(), printAndCount);
    std::cout << "Even numbers after multiplication: " << evenCount << "\\n";
}

// Demonstrate mutable lambdas and return types
void mutableAndReturnLambda()
{
    std::cout << "\\n=== Mutable Lambda and Return Types ===\\n";

    // Mutable lambda
    int counter = 0;
    auto incrementCounter = [counter]() mutable {
        return ++counter;
    };

    std::cout << "Counter: " << incrementCounter() << "\\n";
    std::cout << "Counter: " << incrementCounter() << "\\n";
    std::cout << "Original counter: " << counter << "\\n";

    // Explicit return type
    auto divide = [](double a, double b) -> double {
        if (b == 0)
            return 0;
        return a / b;
    };
    std::cout << "10 / 3 = " << divide(10, 3) << "\\n";
}

// Demonstrate generic lambdas (C++14)
void genericLambda()
{
    std::cout << "\\n=== Generic Lambdas ===\\n";
    auto printAny = [](const auto& x) { std::cout << x << " "; };

    printAny(42);
    printAny(3.14);
    printAny("Hello");
    std::cout << "\\n";
}

auto main(int argc, const char* argv[]) -> int
{
    basicLambda();
    captureLambda();
    mutableAndReturnLambda();
    genericLambda();
    return 0;
}`,

        "Template Example": `#include <iostream>
#include <type_traits>
#include <numeric>
#include <vector>

// Basic function template
template<typename T>
T maximum(T a, T b)
{
    return (a > b) ? a : b;
}

// Class template with multiple parameters
template<typename T, size_t Size>
class Array
{
private:
    T data[Size];

public:
    Array() = default;
    
    T& operator[](size_t index)
    {
        if (index >= Size) throw std::out_of_range("Index out of bounds");
        return data[index];
    }
    
    size_t size() const { return Size; }
};

// Template specialization
template<>
class Array<bool, 8>
{
private:
    unsigned char data;

public:
    Array() : data(0) {}
    
    void set(size_t index, bool value)
    {
        if (index >= 8) throw std::out_of_range("Index out of bounds");
        if (value)
            data |= (1 << index);
        else
            data &= ~(1 << index);
    }
    
    bool get(size_t index) const
    {
        if (index >= 8) throw std::out_of_range("Index out of bounds");
        return (data & (1 << index)) != 0;
    }
};

// Template with concepts (C++20)
template<typename T>
concept Numeric = std::is_arithmetic_v<T>;

template<Numeric T>
T sum(const std::vector<T>& values)
{
    return std::accumulate(values.begin(), values.end(), T());
}

// Variadic template
template<typename T>
T add(T value)
{
    return value;
}

template<typename T, typename... Args>
T add(T first, Args... args) {
    return first + add(args...);
}

int main(int argc, const char* argv[])
{
    // Basic template usage
    std::cout << "Maximum of 10 and 20: " << maximum(10, 20) << "\\n";
    std::cout << "Maximum of 3.14 and 2.718: " << maximum(3.14, 2.718) << "\\n";

    // Array template
    Array<int, 5> numbers;
    for (size_t i = 0; i < numbers.size(); ++i)
        numbers[i] = i * i;
    
    std::cout << "\\nSquare numbers: ";
    for (size_t i = 0; i < numbers.size(); ++i)
        std::cout << numbers[i] << " ";
    std::cout << "\\n";

    // Specialized boolean array
    Array<bool, 8> flags;
    flags.set(0, true);
    flags.set(3, true);
    flags.set(7, true);
    
    std::cout << "\\nBoolean array bits: ";
    for (size_t i = 0; i < 8; ++i)
        std::cout << flags.get(i) << " ";
    std::cout << "\\n";

    // Concept-constrained template
    std::vector<double> values = {1.1, 2.2, 3.3, 4.4, 5.5};
    std::cout << "\\nSum of values: " << sum(values) << "\\n";

    // Variadic template
    std::cout << "\\nSum of multiple values: " 
              << add(1, 2, 3, 4, 5) << "\\n";

    return 0;
}`,
        "Linear Containers": `#include <iostream>
#include <vector>
#include <list>
#include <deque>
#include <forward_list>
#include <algorithm>
#include <iterator>

// Template function to print any container
template<typename Container>
void printContainer(const Container& c, const std::string& name)
{
    std::cout << name << ": ";
    std::copy(std::begin(c), std::end(c), 
        std::ostream_iterator<typename Container::value_type>(std::cout, " "));
    std::cout << "\\n";
}

int main()
{
    // Vector demonstration
    std::vector<int> vec = {1, 2, 3, 4, 5};
    printContainer(vec, "Vector");
    
    // Insert and erase operations
    vec.insert(vec.begin() + 2, 10);
    vec.erase(vec.end() - 1);
    printContainer(vec, "Modified vector");

    // List demonstration
    std::list<int> lst(vec.begin(), vec.end());
    lst.push_front(0);
    lst.push_back(6);
    printContainer(lst, "List");

    // Deque (double-ended queue) demonstration
    std::deque<int> deq;
    deq.push_front(1);
    deq.push_back(2);
    deq.push_front(0);
    deq.push_back(3);
    printContainer(deq, "Deque");

    // Forward list (singly-linked list) demonstration
    std::forward_list<int> flist = {1, 2, 3, 4};
    flist.push_front(0);
    flist.insert_after(flist.begin(), 5);
    printContainer(flist, "Forward list");

    // Iterator categories demonstration
    std::cout << "\\nIterator demonstrations:\\n";
    
    // Forward iteration
    std::cout << "Forward iteration: ";
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        std::cout << *it << " ";
    }
    std::cout << "\\n";

    // Reverse iteration
    std::cout << "Reverse iteration: ";
    for (auto it = vec.rbegin(); it != vec.rend(); ++it) {
        std::cout << *it << " ";
    }
    std::cout << "\\n";

    // Random access
    std::cout << "Third element: " << vec[2] << "\\n";
    std::cout << "Last element: " << vec.back() << "\\n";

    // Algorithm usage with iterators
    std::cout << "\\nAlgorithm demonstrations:\\n";
    auto minElement = std::min_element(vec.begin(), vec.end());
    auto maxElement = std::max_element(vec.begin(), vec.end());
    std::cout << "Min element: " << *minElement << "\\n";
    std::cout << "Max element: " << *maxElement << "\\n";

    // Sort the vector
    std::sort(vec.begin(), vec.end(), std::greater<int>());
    printContainer(vec, "Sorted vector (descending)");

    return 0;
}`,

        "STL Algorithms": `#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <random>
#include <iomanip>

void print(const std::string& label, const std::vector<int>& v)
{
    std::cout << label << ": ";
    for (int x : v) std::cout << x << " ";
    std::cout << "\\n";
}

int main(int argc, const char* argv[])
{
    // Initialize vector
    std::vector<int> numbers = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3};
    print("Original", numbers);

    // Sorting algorithms
    std::sort(numbers.begin(), numbers.end());
    print("Sorted", numbers);

    std::random_device rd;
    std::mt19937 gen(rd());
    std::shuffle(numbers.begin(), numbers.end(), gen);
    print("Shuffled", numbers);

    // Searching algorithms
    int target = 5;
    auto it = std::find(numbers.begin(), numbers.end(), target);
    if (it != numbers.end())
        std::cout << "Found " << target << " at position: " 
                 << std::distance(numbers.begin(), it) << "\\n";

    std::sort(numbers.begin(), numbers.end());
    bool exists = std::binary_search(numbers.begin(), numbers.end(), target);
    std::cout << target << (exists ? " exists" : " does not exist") << "\\n";

    // Counting and finding
    int count = std::count(numbers.begin(), numbers.end(), target);
    std::cout << "Count of " << target << ": " << count << "\\n";

    auto [min, max] = std::minmax_element(numbers.begin(), numbers.end());
    std::cout << "Min: " << *min << ", Max: " << *max << "\\n";

    // Numeric algorithms
    int sum = std::accumulate(numbers.begin(), numbers.end(), 0);
    double mean = static_cast<double>(sum) / numbers.size();
    std::cout << "Sum: " << sum << ", Mean: " << std::fixed 
              << std::setprecision(2) << mean << "\\n";

    std::vector<int> products(numbers.size());
    std::partial_sum(numbers.begin(), numbers.end(), products.begin());
    print("Running sum", products);

    // Modifying algorithms
    std::vector<int> squared(numbers.size());
    std::transform(numbers.begin(), numbers.end(), squared.begin(),
                  [](int x) { return x * x; });
    print("Squared", squared);

    std::replace_if(numbers.begin(), numbers.end(),
                   [](int x) { return x % 2 == 0; }, 0);
    print("Replace even with 0", numbers);

    // Set operations
    std::vector<int> set1 = {1, 2, 3, 4, 5};
    std::vector<int> set2 = {4, 5, 6, 7, 8};
    std::vector<int> result;

    std::set_intersection(set1.begin(), set1.end(),
                         set2.begin(), set2.end(),
                         std::back_inserter(result));
    print("Intersection", result);

    result.clear();
    std::set_union(set1.begin(), set1.end(),
                  set2.begin(), set2.end(),
                  std::back_inserter(result));
    print("Union", result);

    return 0;
}`,
        "Associative Containers": `#include <iostream>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>
#include <string>

template<typename Container>
void printContainer(const std::string& label, const Container& container)
{
    std::cout << label << ": ";
    for (const auto& element : container)
        std::cout << element << " ";
    std::cout << "\\n";
}

template<typename Map>
void printMap(const std::string& label, const Map& container)
{
    std::cout << label << ":\\n";
    for (const auto& [key, value] : container)
        std::cout << "  " << key << ": " << value << "\\n";
}

void demonstrateOrderedMap()
{
    std::cout << "=== Ordered Map ===\\n";
    std::map<std::string, int> scores {
        {"Alice", 95},
        {"Bob", 89},
        {"Charlie", 91}
    };
    
    printMap("Initial scores", scores);
    
    // Search and modify
    if (auto it = scores.find("Bob"); it != scores.end())
        it->second += 5;
    
    scores.insert_or_assign("David", 88);
    printMap("Updated scores", scores);
}

void demonstrateUnorderedMap()
{
    std::cout << "\\n=== Unordered Map ===\\n";
    std::unordered_map<std::string, int> ages {
        {"David", 25},
        {"Eve", 31},
        {"Frank", 28}
    };
    
    printMap("Ages", ages);
    std::cout << "Bucket count: " << ages.bucket_count() << "\\n";
}

void demonstrateOrderedSet()
{
    std::cout << "\\n=== Ordered Set ===\\n";
    std::set<int> numbers {5, 2, 8, 1, 9, 3};
    
    printContainer("Sorted numbers", numbers);
    
    auto [iter, inserted] = numbers.insert(4);
    std::cout << "Inserted 4: " << (inserted ? "yes" : "no") << "\\n";
    
    printContainer("Updated numbers", numbers);
}

void demonstrateUnorderedSet()
{
    std::cout << "\\n=== Unordered Set ===\\n";
    std::unordered_set<std::string> words {"apple", "banana", "cherry"};
    
    words.insert("date");
    words.erase("banana");
    
    printContainer("Words", words);
    std::cout << "Contains 'apple': " 
              << (words.contains("apple") ? "yes" : "no") << "\\n";
}

int main(int argc, const char* argv[])
{
    demonstrateOrderedMap();
    demonstrateUnorderedMap();
    demonstrateOrderedSet();
    demonstrateUnorderedSet();
    return 0;
}`,
        "Ranges Operations": `#include <iostream>
#include <ranges>
#include <vector>

int main(int argc, const char* argv[])
{
    std::vector<std::vector<int>> numbers = {
        { 1, 2, 3 },
        { 4, 5, 6 },
        { 7, 8, 9 },
        { 10, 11, 12 },
        { 13, 14, 15 }
    };

    auto view = numbers
        | std::views::join              // Flatten 2D vector into 1D
        | std::views::filter([](int n)
            { return n % 2 == 0; })     // Keep only even numbers
        | std::views::transform([](int n)
            { return n * n; })          // Square each number
        | std::views::filter([](int n)
            { return n > 20; })         // Keep numbers greater than 20
        | std::views::transform([](int n)
            { return n / 2; })          // Halve each number
        | std::views::take(4);          // Take first 4 elements

    for (int n : view) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    return 0;
}`
    }
};



function updateTemplates() {
    const lang = document.getElementById("language").value;
    const templateSelect = document.getElementById("template");
    templateSelect.innerHTML = ''; // Clear existing options

    // Add template options based on current language
    for (const name in templates[lang]) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        templateSelect.appendChild(option);
    }
}

// Initialize editor with default template
updateTemplates();
document.getElementById("template").value = "Hello World";
editor.setValue(templates[document.getElementById("language").value]["Hello World"]);