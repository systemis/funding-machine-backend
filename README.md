# DCA Strategy Smart Contract

## Overview

Welcome to the DCA (Dollar Cost Averaging) Strategy Smart Contract repository. This project provides a decentralized application (dApp) enabling users to create and manage automated DCA strategies for purchasing cryptocurrencies. By leveraging smart contracts on the Ethereum blockchain, this solution ensures transparency, security, and automation without the need for intermediaries.

<p align="center">
  <img src="https://ethereum.org/_next/image/?url=%2F_next%2Fstatic%2Fmedia%2Fhero.94a1ecc4.png&w=1920&q=75" alt="ethereum" />
</p>

## Features

- **Automated DCA Purchases**: Set up recurring purchases of selected cryptocurrencies at predefined intervals.
- **User-Friendly Interface**: Easy-to-use interface for creating and managing DCA strategies.
- **Secure and Transparent**: Built on the Ethereum blockchain to ensure security and transparency of transactions.
- **Customizable Intervals**: Flexible scheduling options (daily, weekly, monthly) for DCA purchases.
- **Multi-Cryptocurrency Support**: Supports a variety of cryptocurrencies available on decentralized exchanges.

## Getting Started

### Prerequisites

- Node.js and npm installed
- Truffle or Hardhat for smart contract development and testing
- MetaMask or any Ethereum wallet for interacting with the dApp
- An Ethereum node provider (e.g., Infura, Alchemy)

### Installation

1. **Clone the Repository**

    ```bash
    git clone https://github.com/yourusername/dca-strategy.git
    cd dca-strategy
    ```

2. **Install Dependencies**

    ```bash
    npm install
    ```

3. **Compile the Smart Contracts**

    Using Truffle:
    ```bash
    truffle compile
    ```

    Using Hardhat:
    ```bash
    npx hardhat compile
    ```

4. **Deploy the Smart Contracts**

    Using Truffle:
    ```bash
    truffle migrate --network <network_name>
    ```

    Using Hardhat:
    ```bash
    npx hardhat run scripts/deploy.js --network <network_name>
    ```

5. **Run Tests**

    Using Truffle:
    ```bash
    truffle test
    ```

    Using Hardhat:
    ```bash
    npx hardhat test
    ```

### Configuration

- **Network Configuration**: Configure your desired Ethereum network in `truffle-config.js` or `hardhat.config.js`.
- **Environment Variables**: Create a `.env` file to store your private keys and provider URLs securely.

### Usage

1. **Connect Wallet**: Connect your Ethereum wallet (e.g., MetaMask) to the dApp.
2. **Create DCA Strategy**: Input the desired cryptocurrency, purchase interval, and amount to set up your DCA strategy.
3. **Manage Strategies**: View, edit, or delete your existing DCA strategies through the dApp interface.

## Project Structure

- `contracts/`: Solidity smart contracts
- `migrations/`: Deployment scripts
- `scripts/`: Additional scripts (e.g., deployment scripts for Hardhat)
- `test/`: Unit tests for smart contracts
- `src/`: Frontend source code (React.js)
- `public/`: Public assets for the frontend

## Contributing

We welcome contributions to enhance the functionality and usability of this project. Please follow the steps below to contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## Contact

For questions or support, please open an issue in this repository or reach out to the project maintainers.

Happy investing with Dollar Cost Averaging!

---

*This README.md file provides a comprehensive guide for setting up and using the DCA Strategy Smart Contract project. It covers installation, configuration, usage, and contribution guidelines to help users and developers engage with the project effectively.*
