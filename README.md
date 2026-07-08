# Aution Platform

Hệ thống bao gồm 3 thành phần: `contracts`, `server` và `frontend`. Dưới đây là hướng dẫn khởi động từng phần ở môi trường local.

## 1. Contracts

Mở terminal và di chuyển vào thư mục `contracts`:

```bash
cd contracts
npm install
```

Khởi động local blockchain (Hardhat node). **Lưu ý: giữ terminal này chạy liên tục.**

```bash
npx hardhat node
```

Mở một **terminal mới**, di chuyển vào `contracts` để deploy và export ABI:

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/export_abi.ts --network localhost
```

### Kết nối Metamask với Hardhat Localhost

1. Mở extension Metamask trên trình duyệt.
2. Chọn thêm mạng (Add network) -> Thêm mạng thủ công (Add a network manually).
3. Nhập các thông tin sau:
   - **Network Name**: Hardhat
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
4. Lưu và chuyển sang mạng vừa tạo.
5. Copy một Private Key bất kỳ từ terminal đang chạy `npx hardhat node` và Import Account vào Metamask để có sẵn ETH test.

---

## 2. Server

Mở một **terminal mới** để chạy backend:

```bash
cd server
npm install
npm run dev
```

---

## 3. Frontend

Mở thêm một **terminal mới** để chạy giao diện người dùng:

```bash
cd frontend
npm install
npm run dev
```

Sau khi chạy xong, truy cập vào đường dẫn localhost được in ra trên terminal để xem giao diện.
