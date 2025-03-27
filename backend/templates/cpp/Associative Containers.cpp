#include <iostream>
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
    std::cout << "\n";
}

template<typename Map>
void printMap(const std::string& label, const Map& container)
{
    std::cout << label << ":\n";
    for (const auto& [key, value] : container)
        std::cout << "  " << key << ": " << value << "\n";
}

void demonstrateOrderedMap()
{
    std::cout << "=== Ordered Map ===\n";
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
    std::cout << "\n=== Unordered Map ===\n";
    std::unordered_map<std::string, int> ages {
        {"David", 25},
        {"Eve", 31},
        {"Frank", 28}
    };
    
    printMap("Ages", ages);
    std::cout << "Bucket count: " << ages.bucket_count() << "\n";
}

void demonstrateOrderedSet()
{
    std::cout << "\n=== Ordered Set ===\n";
    std::set<int> numbers {5, 2, 8, 1, 9, 3};
    
    printContainer("Sorted numbers", numbers);
    
    auto [iter, inserted] = numbers.insert(4);
    std::cout << "Inserted 4: " << (inserted ? "yes" : "no") << "\n";
    
    printContainer("Updated numbers", numbers);
}

void demonstrateUnorderedSet()
{
    std::cout << "\n=== Unordered Set ===\n";
    std::unordered_set<std::string> words {"apple", "banana", "cherry"};
    
    words.insert("date");
    words.erase("banana");
    
    printContainer("Words", words);
    std::cout << "Contains 'apple': " 
              << (words.contains("apple") ? "yes" : "no") << "\n";
}

int main(int argc, const char* argv[])
{
    demonstrateOrderedMap();
    demonstrateUnorderedMap();
    demonstrateOrderedSet();
    demonstrateUnorderedSet();
    return 0;
}