#include <iostream>
#include <memory>
#include <vector>
#include <string>

class Animal
{
public:
    Animal(const std::string& name) : name_(name) 
    {
        std::cout << "Animal " << name_ << " created\n";
    }
    
    virtual ~Animal() 
    {
        std::cout << "Animal " << name_ << " destroyed\n";
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
    void makeSound() const override { std::cout << name_ << " says: Woof!\n"; }
};

class Cat : public Animal {
public:
    Cat(const std::string& name) : Animal(name) {}
    void makeSound() const override { std::cout << name_ << " says: Meow!\n"; }
};

// Custom deleter example
struct AnimalShelter {
    void operator()(Animal* animal) {
        std::cout << "Shelter releasing " << animal->getName() << "\n";
        delete animal;
    }
};

int main()
{
    std::cout << "=== Smart Pointer Demonstrations ===\n\n";

    // unique_ptr demonstration
    std::cout << "1. std::unique_ptr (exclusive ownership):\n";
    {
        auto dog = std::make_unique<Dog>("Buddy");
        dog->makeSound();
        
        // Won't compile - unique_ptr cannot be copied
        // auto dog2 = dog;
        
        // Transfer ownership
        auto new_owner = std::move(dog);
        new_owner->makeSound();
        
        std::cout << "Is original pointer empty? " << (dog == nullptr ? "Yes\n" : "No\n");
    }

    std::cout << "\n2. std::shared_ptr (shared ownership):\n";
    {
        auto cat1 = std::make_shared<Cat>("Whiskers");
        std::cout << "Reference count: " << cat1.use_count() << "\n";
        
        {
            auto cat2 = cat1;  // Share ownership
            std::cout << "Reference count: " << cat1.use_count() << "\n";
            cat2->makeSound();
        }
        
        std::cout << "After inner scope, reference count: " << cat1.use_count() << "\n";
    }

    std::cout << "\n3. std::weak_ptr (non-owning reference):\n";
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
        
        std::cout << "Is weak_ptr expired? " << (weak_animal.expired() ? "Yes\n" : "No\n");
    }

    std::cout << "\n4. Custom deleter with smart pointer:\n";
    {
        std::unique_ptr<Animal, AnimalShelter> shelter_animal(new Dog("Rocky"), AnimalShelter());
        shelter_animal->makeSound();
    }

    return 0;
} 