#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <random>
#include <iomanip>

void print(const std::string& label, const std::vector<int>& v)
{
    std::cout << label << ": ";
    for (int x : v) std::cout << x << " ";
    std::cout << "\n";
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
                 << std::distance(numbers.begin(), it) << "\n";

    std::sort(numbers.begin(), numbers.end());
    bool exists = std::binary_search(numbers.begin(), numbers.end(), target);
    std::cout << target << (exists ? " exists" : " does not exist") << "\n";

    // Counting and finding
    int count = std::count(numbers.begin(), numbers.end(), target);
    std::cout << "Count of " << target << ": " << count << "\n";

    auto [min, max] = std::minmax_element(numbers.begin(), numbers.end());
    std::cout << "Min: " << *min << ", Max: " << *max << "\n";

    // Numeric algorithms
    int sum = std::accumulate(numbers.begin(), numbers.end(), 0);
    double mean = static_cast<double>(sum) / numbers.size();
    std::cout << "Sum: " << sum << ", Mean: " << std::fixed 
              << std::setprecision(2) << mean << "\n";

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
}