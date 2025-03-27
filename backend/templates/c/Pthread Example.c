#include <stdio.h>
#include <pthread.h>
#include <stdlib.h>
#include <unistd.h>

#define NUM_THREADS 3
#define NUM_INCREMENTS 1000000

long shared_counter = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

void* increment_counter(void* arg)
{
    int thread_id = *(int*)arg;
    
    for (int i = 0; i < NUM_INCREMENTS; i++) {
        pthread_mutex_lock(&mutex);
        shared_counter++;
        pthread_mutex_unlock(&mutex);
    }
    
    printf("Thread %d finished\n", thread_id);
    return NULL;
}

int main(int argc, const char* argv[])
{
    pthread_t threads[NUM_THREADS];
    int thread_ids[NUM_THREADS];
    
    printf("Starting value: %ld\n", shared_counter);
    
    // Create threads
    for (int i = 0; i < NUM_THREADS; i++) {
        thread_ids[i] = i;
        if (pthread_create(&threads[i], NULL, increment_counter, &thread_ids[i]) != 0) {
            perror("Thread creation failed");
            return 1;
        }
    }
    
    // Wait for all threads to complete
    for (int i = 0; i < NUM_THREADS; i++) {
        pthread_join(threads[i], NULL);
    }
    
    printf("Final value: %ld\n", shared_counter);
    printf("Expected value: %ld\n", (long)NUM_THREADS * NUM_INCREMENTS);
    
    pthread_mutex_destroy(&mutex);
    return 0;
} 