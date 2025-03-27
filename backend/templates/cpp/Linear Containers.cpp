#include <iostream>
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
    std::cout << "\n";
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
    std::cout << "\nIterator demonstrations:\n";
    
    // Forward iteration
    std::cout << "Forward iteration: ";
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        std::cout << *it << " ";
    }
    std::cout << "\n";

    // Reverse iteration
    std::cout << "Reverse iteration: ";
    for (auto it = vec.rbegin(); it != vec.rend(); ++it) {
        std::cout << *it << " ";
    }
    std::cout << "\n";

    // Random access
    std::cout << "Third element: " << vec[2] << "\n";
    std::cout << "Last element: " << vec.back() << "\n";

    // Algorithm usage with iterators
    std::cout << "\nAlgorithm demonstrations:\n";
    auto minElement = std::min_element(vec.begin(), vec.end());
    auto maxElement = std::max_element(vec.begin(), vec.end());
    std::cout << "Min element: " << *minElement << "\n";
    std::cout << "Max element: " << *maxElement << "\n";

    // Sort the vector
    std::sort(vec.begin(), vec.end(), std::greater<int>());
    printContainer(vec, "Sorted vector (descending)");

    return 0;
} 