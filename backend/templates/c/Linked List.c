#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

struct Node* create_node(int data)
{
    struct Node* new_node = (struct Node*)malloc(sizeof(struct Node));
    if (new_node == NULL) {
        printf("Memory allocation failed!\n");
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
    printf("NULL\n");
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
} 