#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <stdbool.h>

// Number of vertices in the graph
#define V 9

// Find the vertex with minimum distance value
int find_min_distance(const int dist[], const bool visited[])
{
    int min = INT_MAX;
    int min_index = 0;

    for (int v = 0; v < V; v++)
    {
        if (!visited[v] && dist[v] < min)
        {
            min = dist[v];
            min_index = v;
        }
    }
    return min_index;
}

// Print shortest path distances
void print_distances(const int dist[])
{
    printf("Vertex      Distance\n");
    printf("-------------------\n");
    for (int i = 0; i < V; i++)
    {
        printf("%-6d      %d\n", i, dist[i]);
    }
}

// Find shortest paths from source to all vertices
void dijkstra(const int graph[V][V], int src)
{
    int dist[V];     // Shortest distance from source
    bool visited[V]; // Track visited vertices

    // Initialize all distances as infinite
    for (int i = 0; i < V; i++)
    {
        dist[i] = INT_MAX;
        visited[i] = false;
    }

    // Distance to source is always 0
    dist[src] = 0;

    // Find shortest path for all vertices
    for (int count = 0; count < V - 1; count++)
    {
        int u = find_min_distance(dist, visited);
        visited[u] = true;

        // Update dist[] for adjacent vertices
        for (int v = 0; v < V; v++)
        {
            if (!visited[v] && graph[u][v] &&
                dist[u] != INT_MAX &&
                dist[u] + graph[u][v] < dist[v])
            {
                dist[v] = dist[u] + graph[u][v];
            }
        }
    }

    print_distances(dist);
}

int main(int argc, const char *argv[])
{
    // Example graph represented as adjacency matrix
    int graph[V][V] = {
        {0, 4, 0, 0, 0, 0, 0, 8, 0},
        {4, 0, 8, 0, 0, 0, 0, 11, 0},
        {0, 8, 0, 7, 0, 4, 0, 0, 2},
        {0, 0, 7, 0, 9, 14, 0, 0, 0},
        {0, 0, 0, 9, 0, 10, 0, 0, 0},
        {0, 0, 4, 14, 10, 0, 2, 0, 0},
        {0, 0, 0, 0, 0, 2, 0, 1, 6},
        {8, 11, 0, 0, 0, 0, 1, 0, 7},
        {0, 0, 2, 0, 0, 0, 6, 7, 0}};

    printf("Finding shortest paths from vertex 0:\n\n");
    dijkstra(graph, 0);
    return 0;
}