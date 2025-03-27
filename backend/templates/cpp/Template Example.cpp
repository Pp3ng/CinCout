#include <iostream>
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
    std::cout << "Maximum of 10 and 20: " << maximum(10, 20) << "\n";
    std::cout << "Maximum of 3.14 and 2.718: " << maximum(3.14, 2.718) << "\n";

    // Array template
    Array<int, 5> numbers;
    for (size_t i = 0; i < numbers.size(); ++i)
        numbers[i] = i * i;
    
    std::cout << "\nSquare numbers: ";
    for (size_t i = 0; i < numbers.size(); ++i)
        std::cout << numbers[i] << " ";
    std::cout << "\n";

    // Specialized boolean array
    Array<bool, 8> flags;
    flags.set(0, true);
    flags.set(3, true);
    flags.set(7, true);
    
    std::cout << "\nBoolean array bits: ";
    for (size_t i = 0; i < 8; ++i)
        std::cout << flags.get(i) << " ";
    std::cout << "\n";

    // Concept-constrained template
    std::vector<double> values = {1.1, 2.2, 3.3, 4.4, 5.5};
    std::cout << "\nSum of values: " << sum(values) << "\n";

    // Variadic template
    std::cout << "\nSum of multiple values: " 
              << add(1, 2, 3, 4, 5) << "\n";

    return 0;
} 