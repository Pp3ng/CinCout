const templates = {
    c: {
        "Hello World": `#include <stdio.h>

int main(int argc, const char* argv[])
{
    printf("Hello, World!\\n");
    return 0;
}`,
        "Array Average": `#include <stdio.h>

int main(int argc, const char* argv[])
{
    int arr[] = {2, 4, 6, 8, 10};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }

    printf("Average: %.2f\\n", (float)sum / 5);
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
    int n = 6;
    printf("Fibonacci of %d is %d\\n", n, fibonacci(n));
    return 0;
}`,
        "Dynamic Memory": `#include <stdio.h>
#include <stdlib.h>

int main(int argc, const char* argv[])
{
    int n = 5;
    int* arr = malloc(n * sizeof(int));
    int sum = 0;

    for (int i = 0; i < n; i++) {
        arr[i] = i + 1;
        sum += arr[i];
    }

    printf("Sum: %d\\n", sum);
    free(arr);
    return 0;
}`,
        "Process Fork": `#include <stdio.h>
#include <unistd.h>

int main(int argc, const char* argv[])
{
    pid_t pid = fork();

    if (pid < 0) {
        perror("Fork failed");
        return 1;
    } else if (pid == 0) {
        printf("Hello from child process!\\n");
    } else {
        printf("Hello from parent process!\\n");
    }

    return 0;
}`,
        "Pthread Example": `#include <stdio.h>
#include <pthread.h>
#include <stdlib.h>

void* thread_func(void* arg)
{
    printf("Hello from thread!\\n");
    return NULL;
}

int main(int argc, const char* argv[])
{
    pthread_t thread;
    if (pthread_create(&thread, NULL, thread_func, NULL) != 0) {
        perror("Thread creation failed");
        return 1;
    }
    
    pthread_join(thread, NULL);
    printf("Main thread exiting...\\n");
    return 0;
}`,
        "String Copy": `#include <stdio.h>
#include <string.h>

int main(int argc, const char* argv[])
{
    char source[] = "Hello, World!";
    char destination[50];
    strcpy(destination, source);
    printf("Copied string: %s\\n", destination);
    return 0;
}`,
        "Pointer Arithmetic": `#include <stdio.h>

int main(int argc, const char* argv[])
{
    int arr[] = {10, 20, 30, 40, 50};
    int* ptr = arr;

    printf("Second element: %d\\n", *(ptr + 1));
    return 0;
}`,
        "Swap with Pointers": `#include <stdio.h>

void swap(int* a, int* b)
{
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main(int argc, const char* argv[])
{
    int x = 5, y = 10;
    swap(&x, &y);
    printf("After swap: x = %d, y = %d\\n", x, y);
    return 0;
}`,
        "Matrix Addition": `#include <stdio.h>

int main(int argc, const char* argv[])
{
    int mat1[2][2] = {{1, 2}, {3, 4}};
    int mat2[2][2] = {{5, 6}, {7, 8}};
    int result[2][2];

    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 2; j++) {
            result[i][j] = mat1[i][j] + mat2[i][j];
            printf("%d ", result[i][j]);
        }
        printf("\\n");
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