/**
 * Security utilities for code validation
 */

// Check for dangerous system calls
const containsDangerousCalls = (code) => {
  const dangerousCalls = [
    // Process manipulation
    "fork", "vfork", "clone", "exec", "system", "popen", 
    "spawn", "posix_spawn", "daemon", "setpgrp", "setsid",

    // Network operations
    "socket", "connect", "bind", "listen", "accept", 
    "recv", "send", "sendto", "recvfrom", "gethostbyname",
    "getaddrinfo", "inet_addr", "inet_ntoa", "socketpair",
    "setsockopt", "getsockopt", "shutdown",

    // File system operations
    "unlink", "remove", "rename", "symlink", "link",
    "mkdir", "rmdir", "chmod", "chown", "truncate",
    "open", "creat", "mknod", "mkfifo", "mount", "umount",
    "chroot", "pivot_root", "sync", "fsync",

    // Process control and signals
    "ptrace", "kill", "raise", "abort", "signal",
    "sigaction", "sigsuspend", "sigwait", "setuid",
    "setgid", "setgroups", "capabilities", "reboot",
    "sysctl", "nice", "setpriority", "setrlimit",

    // Shell commands
    "system", "popen", "execl", "execlp", "execle",
    "execv", "execvp", "execvpe", "`", "shell",
    "dlopen", "dlsym", "dlclose",

    // Memory manipulation
    "asm", "__asm", "__asm__", "inline", "__builtin",
    "mmap", "mprotect", "shmat", "shmctl", "shmget",
    "semget", "semctl", "semop", "msgget", "msgsnd",
    "msgrcv", "msgctl",

    // Dangerous standard library functions
    "gets", "getwd", "mktemp", "tmpnam",
    "setenv", "putenv", "alloca", "longjmp", "setjmp",
    "atexit", "_exit", "quick_exit", "at_quick_exit"
  ];

  return dangerousCalls.some(call => code.includes(call + "("));
};

/**
 * Enhanced code validation
 * @param {string} code - Code to validate
 * @returns {Object} Validation result
 */
const validateCodeSecurity = (code) => {
  // Basic validation
  if (!code || code.trim() === '') {
    return { valid: false, error: 'Error: No code provided' };
  }

  // Security check
  if (containsDangerousCalls(code)) {
    return { valid: false, error: 'Error: Code contains restricted function calls' };
  }

  // Check code length
  if (code.length > 50000) {
    return { valid: false, error: 'Error: Code exceeds maximum length of 50,000 characters' };
  }

  // Check line count
  if (code.split('\n').length > 1000) {
    return { valid: false, error: 'Error: Code exceeds maximum of 1,000 lines' };
  }

  return { valid: true };
};

module.exports = {
  containsDangerousCalls,
  validateCodeSecurity
}; 