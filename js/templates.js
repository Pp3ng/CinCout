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
        "Fork and Network": `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/wait.h>
#include <time.h>

void handle_error(const char* msg)
{
    perror(msg);
    exit(1);
}

char* generate_socket_path()
{
    static char path[128];
    snprintf(path, sizeof(path), "/tmp/ipc_socket_%d_%ld", getpid(), time(NULL));
    return path;
}

void child_process(int sock)
{
    char buffer[1024];
    
    // Receive message from parent
    ssize_t bytes_received = recv(sock, buffer, sizeof(buffer) - 1, 0);
    if (bytes_received < 0) handle_error("Child receive failed");
    
    buffer[bytes_received] = '\\0';
    printf("Child received: %s\\n", buffer);
    
    // Send response to parent
    const char* response = "Hello, parent process!";
    if (send(sock, response, strlen(response), 0) < 0) {
        handle_error("Child send failed");
    }
    
    close(sock);
}

void parent_process(int sock)
{
    // Send message to child
    const char* message = "Hello, child process!";
    if (send(sock, message, strlen(message), 0) < 0) {
        handle_error("Parent send failed");
    }
    
    // Receive child's response
    char buffer[1024];
    ssize_t bytes_received = recv(sock, buffer, sizeof(buffer) - 1, 0);
    if (bytes_received < 0) handle_error("Parent receive failed");
    
    buffer[bytes_received] = '\\0';
    printf("Parent received: %s\\n", buffer);
    
    close(sock);
}

int main(int argc, const char* argv[])
{
    char* socket_path = generate_socket_path();
    unlink(socket_path);  // Remove old socket file if exists
    
    // Create Unix domain socket
    int server_sock = socket(AF_UNIX, SOCK_STREAM, 0);
    if (server_sock < 0) handle_error("Socket creation failed");
    
    // Setup server address
    struct sockaddr_un server_addr = {0};
    server_addr.sun_family = AF_UNIX;
    strncpy(server_addr.sun_path, socket_path, sizeof(server_addr.sun_path) - 1);
    
    // Bind socket
    if (bind(server_sock, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        handle_error("Bind failed");
    }
    
    // Listen for connections
    if (listen(server_sock, 1) < 0) handle_error("Listen failed");
    
    pid_t pid = fork();
    if (pid < 0) {
        handle_error("Fork failed");
    }
    
    if (pid == 0) {  // Child process
        // Connect to server
        int client_sock = socket(AF_UNIX, SOCK_STREAM, 0);
        if (client_sock < 0) handle_error("Client socket creation failed");
        
        struct sockaddr_un client_addr = {0};
        client_addr.sun_family = AF_UNIX;
        strncpy(client_addr.sun_path, socket_path, sizeof(client_addr.sun_path) - 1);
        
        if (connect(client_sock, (struct sockaddr*)&client_addr, sizeof(client_addr)) < 0) {
            handle_error("Connect failed");
        }
        
        child_process(client_sock);
        exit(0);
    } else {  // Parent process
        // Accept client connection
        int client_sock = accept(server_sock, NULL, NULL);
        if (client_sock < 0) handle_error("Accept failed");
        
        parent_process(client_sock);
        wait(NULL);  // Wait for child to finish
        
        unlink(socket_path);  // Clean up socket file
    }
    
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
        "Vector Sum": `#include <iostream>
#include <vector>
#include <numeric>

int main(int argc, const char* argv[])
{
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = std::accumulate(numbers.begin(), numbers.end(), 0);

    std::cout << "Sum: " << sum << std::endl;
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
        "Smart Pointer": `#include <iostream>
#include <memory>

class Resource {
public:
    Resource() { std::cout << "Resource acquired\\n"; }
    ~Resource() { std::cout << "Resource released\\n"; }

    void greet() const { std::cout << "Hello from Resource\\n"; }
};

int main(int argc, const char* argv[])
{
    auto res = std::make_unique<Resource>();
    res->greet();
    return 0;
}`,
        "Lambda Example": `#include <iostream>
#include <vector>
#include <algorithm>

int main(int argc, const char* argv[])
{
    std::vector<int> nums = {1, 2, 3, 4, 5};
    std::for_each(nums.begin(), nums.end(), [](int n) {
        std::cout << n * n << " ";
    });
    std::cout << std::endl;
    return 0;
}`,
        "Template Example": `#include <iostream>

template<typename T>
T add(T a, T b)
{
    return a + b;
}

int main(int argc, const char* argv[])
{
    std::cout << "Sum of 5 and 4: " << add(5, 4) << std::endl;
    std::cout << "Sum of 5.6 and 4.5: " << add(5.6, 4.5) << std::endl;
    return 0;
}`,
        "Virtual Function": `#include <iostream>

class Animal {
public:
    virtual void speak() const
    {
        std::cout << "Animal speaks!" << std::endl;
    }
};

class Dog : public Animal {
public:
    void speak() const override
    {
        std::cout << "Woof! Woof!" << std::endl;
    }
};

int main(int argc, const char* argv[])
{
    Animal* animal = new Dog();
    animal->speak();
    delete animal;
    return 0;
}`,
        "STL Algorithm": `#include <iostream>
#include <vector>
#include <algorithm>

int main(int argc, const char* argv[])
{
    std::vector<int> numbers = {1, 3, 5, 7, 9};
    int target = 5;
    bool found = std::binary_search(numbers.begin(), numbers.end(), target);

    std::cout << "Target " << (found ? "found" : "not found") << " in array." << std::endl;
    return 0;
}`,
        "Set Container": `#include <iostream>
#include <set>

int main(int argc, const char* argv[])
{
    std::set<int> numbers = {1, 3, 5, 7, 9};
    numbers.insert(4);

    std::cout << "Set elements: ";
    for (int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    int target = 5;
    if (numbers.find(target) != numbers.end()) {
        std::cout << target << " is in the set." << std::endl;
    } else {
        std::cout << target << " is not in the set." << std::endl;
    }
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
        { 10, 11, 12 }
    };

    auto view = numbers
        | std::views::join
        | std::views::filter([](int n) { return n % 2 == 0; })
        | std::views::transform([](int n) { return n * n; })
        | std::views::filter([](int n) { return n > 20; })
        | std::views::transform([](int n) { return n / 2; })
        | std::views::take(4);

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