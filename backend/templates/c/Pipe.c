#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

#define MAX_CMD_LEN 1024

void execute_command(const char* command)
{
    int pipe_fd[2];
    pid_t pid;

    if (pipe(pipe_fd) == -1) {
        perror("Pipe failed");
        return;
    }

    if ((pid = fork()) == -1) {
        perror("Fork failed");
        return;
    }

    if (pid == 0) {
        close(pipe_fd[0]);
        dup2(pipe_fd[1], STDOUT_FILENO);
        execlp(command, command, (char*)NULL);
        perror("Exec failed");
        exit(1);
    } else {
        close(pipe_fd[1]);
        char buffer[MAX_CMD_LEN];
        int bytes_read;
        while ((bytes_read = read(pipe_fd[0], buffer, sizeof(buffer) - 1)) > 0) {
            buffer[bytes_read] = '\0';
            printf("%s", buffer);
        }
        wait(NULL);
    }
}

int main()
{
    char command[MAX_CMD_LEN];
    printf("Enter a command to execute or 'exit' to quit.\n");

    while (1) {
        printf("> ");
        if (fgets(command, sizeof(command), stdin) == NULL) {
            break;
        }

        command[strcspn(command, "\n")] = 0;

        if (strcmp(command, "exit") == 0) {
            break;
        }

        execute_command(command);
    }
    return EXIT_SUCCESS;
}