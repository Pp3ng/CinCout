#include <arpa/inet.h>
#include <chrono>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <netdb.h>
#include <netinet/ip_icmp.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <thread>
#include <unistd.h>

uint16_t checksum(void* buf, int len)
{
    uint16_t* data = (uint16_t*)buf;
    uint32_t sum = 0;
    while (len > 1) {
        sum += *data++;
        len -= 2;
    }
    if (len == 1) {
        sum += *(uint8_t*)data;
    }
    sum = (sum >> 16) + (sum & 0xffff);
    sum += (sum >> 16);
    return (uint16_t)(~sum);
}

int main()
{
    std::string hostname;
    std::cout << "Enter a hostname to ping: ";
    std::cin >> hostname;

    struct addrinfo hints {
    }, *res;
    hints.ai_family = AF_INET;

    if (getaddrinfo(hostname.c_str(), nullptr, &hints, &res) != 0) {
        std::cerr << "Failed to resolve host: " << hostname << std::endl;
        return 1;
    }

    sockaddr_in addr = *(sockaddr_in*)res->ai_addr;
    freeaddrinfo(res);

    int sock = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    if (sock < 0) {
        perror("socket");
        return 1;
    }

    std::cout << "Pinging " << hostname << " (" << inet_ntoa(addr.sin_addr) << ")..." << std::endl;

    int seq = 0;
    while (true) {
        char sendbuf[64] {};
        icmp* icmp_hdr = (icmp*)sendbuf;

        icmp_hdr->icmp_type = ICMP_ECHO;
        icmp_hdr->icmp_code = 0;
        icmp_hdr->icmp_id = getpid() & 0xffff;
        icmp_hdr->icmp_seq = seq++;
        gettimeofday((timeval*)(sendbuf + sizeof(icmp)), nullptr);

        icmp_hdr->icmp_cksum = 0;
        icmp_hdr->icmp_cksum = checksum(icmp_hdr, sizeof(sendbuf));

        auto send_time = std::chrono::steady_clock::now();
        sendto(sock, sendbuf, sizeof(sendbuf), 0, (sockaddr*)&addr, sizeof(addr));

        char recvbuf[1024] {};
        sockaddr_in from {};
        socklen_t fromlen = sizeof(from);
        ssize_t n = recvfrom(sock, recvbuf, sizeof(recvbuf), 0, (sockaddr*)&from, &fromlen);
        if (n > 0) {
            auto recv_time = std::chrono::steady_clock::now();
            auto rtt = std::chrono::duration_cast<std::chrono::milliseconds>(recv_time - send_time).count();
            std::cout << "Reply from " << inet_ntoa(from.sin_addr)
                      << ": icmp_seq=" << (seq - 1)
                      << ", time=" << rtt << "ms" << std::endl;
        }

        std::this_thread::sleep_for(std::chrono::seconds(1));
    }

    close(sock);
    return EXIT_SUCCESS;
}