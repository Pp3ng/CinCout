#include <iostream>
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
        std::cout << "Scaling shape by factor " << factor << "\n";
    }
    
    // Non-virtual function
    void printInfo() const
    {
        std::cout << "Type: " << getType() << "\n"
                  << "Area: " << area() << "\n"
                  << "Perimeter: " << perimeter() << "\n";
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
        std::cout << "Drawing a circle with radius " << radius << "\n";
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
        std::cout << "Drawing a rectangle " << width << "x" << height << "\n";
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
    std::cout << "---\n";
}

int main(int argc, const char* argv[])
{
    // Using smart pointers for automatic memory management
    std::vector<std::unique_ptr<Shape>> shapes;
    
    // Create different shapes
    shapes.push_back(std::make_unique<Circle>(5.0));
    shapes.push_back(std::make_unique<Rectangle>(4.0, 6.0));
    
    // Demonstrate polymorphism
    std::cout << "=== Processing Shapes ===\n";
    for (const auto& shape : shapes) {
        processShape(*shape);
    }
    
    // Demonstrate virtual function override
    std::cout << "\n=== Scaling Shapes ===\n";
    for (auto& shape : shapes) {
        shape->scale(2.0);
        shape->printInfo();
        std::cout << "---\n";
    }
    
    return 0;
} 