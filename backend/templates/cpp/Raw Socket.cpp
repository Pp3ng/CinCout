#include <arpa/inet.h>
#include <chrono>
#include <cstring>
#include <iostream>
#include <memory>
#include <netdb.h>
#include <netinet/ip_icmp.h>
#include <sys/socket.h>
#include <thread>
#include <unistd.h>
#include <vector>

uint16_t checksum(const void* data, size_t len)
{
    const uint16_t* ptr = static_cast<const uint16_t*>(data);
    uint32_t sum = 0;
    while (len > 1)
        sum += *ptr++, len -= 2;
    if (len)
        sum += *reinterpret_cast<const uint8_t*>(ptr);
    sum = (sum >> 16) + (sum & 0xffff);
    sum += (sum >> 16);
    return static_cast<uint16_t>(~sum);
}

sockaddr_in resolve(const std::string& host)
{
    addrinfo hints {}, *res = nullptr;
    hints.ai_family = AF_INET;
    if (getaddrinfo(host.c_str(), nullptr, &hints, &res) != 0)
        throw std::runtime_error("resolve failed");
    std::unique_ptr<addrinfo, decltype(&freeaddrinfo)> res_ptr(res, freeaddrinfo);
    return *reinterpret_cast<sockaddr_in*>(res_ptr->ai_addr);
}

int create_socket()
{
    int s = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    if (s < 0)
        throw std::runtime_error("socket failed");
    return s;
}

void fill_packet(std::vector<uint8_t>& buf, uint16_t id, uint16_t seq)
{
    std::fill(buf.begin(), buf.end(), 0);
    auto* icmp_hdr = reinterpret_cast<icmp*>(buf.data());
    icmp_hdr->icmp_type = ICMP_ECHO;
    icmp_hdr->icmp_id = id;
    icmp_hdr->icmp_seq = seq;
    auto now_us = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::high_resolution_clock::now().time_since_epoch())
                      .count();
    std::memcpy(buf.data() + sizeof(icmp), &now_us, sizeof(now_us));
    icmp_hdr->icmp_cksum = checksum(buf.data(), buf.size());
}

auto main(void) -> int
{
    try {
        std::string host;
        std::cout << "Enter a hostname to ping: ";
        std::cin >> host;
        auto addr = resolve(host);
        int sock = create_socket();
        std::vector<uint8_t> send_buf(64), recv_buf(1024);
        uint16_t pid = getpid() & 0xffff, seq = 0;
        std::cout << "Pinging " << host << " (" << inet_ntoa(addr.sin_addr)
                  << ")..." << std::endl;
        while (true) {
            fill_packet(send_buf, pid, seq);
            auto t1 = std::chrono::steady_clock::now();
            sendto(sock, send_buf.data(), send_buf.size(), 0,
                reinterpret_cast<sockaddr*>(&addr), sizeof(addr));
            sockaddr_in from {};
            socklen_t len = sizeof(from);
            if (recvfrom(sock, recv_buf.data(), recv_buf.size(), 0,
                    reinterpret_cast<sockaddr*>(&from), &len)
                > 0) {
                auto t2 = std::chrono::steady_clock::now();
                auto rtt = std::chrono::duration_cast<std::chrono::milliseconds>(t2 - t1)
                               .count();
                std::cout << "Reply from " << inet_ntoa(from.sin_addr)
                          << ": icmp_seq=" << seq << ", time=" << rtt << "ms\n";
            }
            ++seq;
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        close(sock);
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << '\n';
        return EXIT_FAILURE;
    }
}