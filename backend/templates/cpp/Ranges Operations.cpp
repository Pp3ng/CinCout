#include <iostream>
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
        | std::views::join // Flatten 2D vector into 1D
        | std::views::filter([](int n) { return n % 2 == 0; }) // Keep only even numbers
        | std::views::transform([](int n) { return n * n; }) // Square each number
        | std::views::filter([](int n) { return n > 20; }) // Keep numbers greater than 20
        | std::views::transform([](int n) { return n / 2; }) // Halve each number
        | std::views::take(4); // Take first 4 elements

    for (int n : view) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    return 0;
}