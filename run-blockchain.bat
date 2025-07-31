@echo off
echo ========================================
echo    PestiVid Blockchain Setup
echo ========================================
echo.

echo Choose your blockchain option:
echo 1. Use Avalanche Fuji Testnet (Recommended)
echo 2. Install and run local Ganache
echo 3. Open Remix IDE for contract deployment
echo 4. Just run the frontend (no blockchain)
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Setting up Avalanche Fuji Testnet...
    echo 1. Go to https://faucet.avax.network/
    echo 2. Get free testnet AVAX
    echo 3. Use Remix IDE to deploy contract
    echo 4. Update contract-info.json with deployed address
    echo.
    echo Opening Avalanche Faucet...
    start https://faucet.avax.network/
    echo Opening Remix IDE...
    start https://remix.ethereum.org/
    pause
)

if "%choice%"=="2" (
    echo.
    echo Installing Ganache CLI...
    npm install -g ganache-cli
    echo.
    echo Starting local blockchain...
    echo This will run on http://127.0.0.1:8545
    ganache-cli --host 0.0.0.0 --port 8545 --networkId 1337
)

if "%choice%"=="3" (
    echo.
    echo Opening Remix IDE for contract deployment...
    start https://remix.ethereum.org/
    echo.
    echo Instructions:
    echo 1. Create new file: PestiVid.sol
    echo 2. Copy your contract code
    echo 3. Compile the contract
    echo 4. Deploy using MetaMask
    echo 5. Copy the deployed address
    pause
)

if "%choice%"=="4" (
    echo.
    echo Starting frontend without blockchain...
    echo Opening PestiVid application...
    start fullstack.html
    echo.
    echo Note: This will use localStorage instead of blockchain
    pause
)

echo.
echo Done! Check the instructions above.
pause
