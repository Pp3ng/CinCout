#include <iostream>
#include <vector>
#include <algorithm>
#include <functional>
#include <string>

// Demonstrate basic lambda syntax
void basicLambda()
{
    std::cout << "=== Basic Lambda Syntax ===\n";
    auto simpleLambda = []() { std::cout << "Hello from lambda!\n"; };
    simpleLambda();

    // Lambda with parameters
    auto printNumber = [](int n) { std::cout << "Number: " << n << "\n"; };
    printNumber(42);
}

// Demonstrate lambda captures
void captureLambda()
{
    std::cout << "\n=== Lambda Captures ===\n";
    int multiplier = 10;
    std::vector<int> numbers = {1, 2, 3, 4, 5};

    // Capture by value
    std::for_each(numbers.begin(), numbers.end(),
        [multiplier](int n) { std::cout << n * multiplier << " "; });
    std::cout << "\n";

    // Capture by reference
    int sum = 0;
    std::for_each(numbers.begin(), numbers.end(),
        [&sum](int n) { sum += n; });
    std::cout << "Sum: " << sum << "\n";

    // Mixed capture
    int evenCount = 0;
    auto printAndCount = [&evenCount, multiplier](int n) {
        if (n * multiplier % 2 == 0)
            evenCount++;
    };
    std::for_each(numbers.begin(), numbers.end(), printAndCount);
    std::cout << "Even numbers after multiplication: " << evenCount << "\n";
}

// Demonstrate mutable lambdas and return types
void mutableAndReturnLambda()
{
    std::cout << "\n=== Mutable Lambda and Return Types ===\n";

    // Mutable lambda
    int counter = 0;
    auto incrementCounter = [counter]() mutable {
        return ++counter;
    };

    std::cout << "Counter: " << incrementCounter() << "\n";
    std::cout << "Counter: " << incrementCounter() << "\n";
    std::cout << "Original counter: " << counter << "\n";

    // Explicit return type
    auto divide = [](double a, double b) -> double {
        if (b == 0)
            return 0;
        return a / b;
    };
    std::cout << "10 / 3 = " << divide(10, 3) << "\n";
}

// Demonstrate generic lambdas (C++14)
void genericLambda()
{
    std::cout << "\n=== Generic Lambdas ===\n";
    auto printAny = [](const auto& x) { std::cout << x << " "; };

    printAny(42);
    printAny(3.14);
    printAny("Hello");
    std::cout << "\n";
}

auto main(int argc, const char* argv[]) -> int
{
    basicLambda();
    captureLambda();
    mutableAndReturnLambda();
    genericLambda();
    return 0;
} 