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

---

## 4. Đặc tả Database Off-chain (Supabase)

Hệ thống sử dụng cơ sở dữ liệu off-chain (PostgreSQL trên Supabase) để lưu trữ các thông tin phụ trợ, tối ưu hóa truy vấn và cache dữ liệu từ blockchain (thông qua Event Listener).

### Các bảng và trường dữ liệu chính:

1. **`auctions`**: Lưu thông tin các phiên đấu giá (đồng bộ từ blockchain).
   - `auction_id`: ID phiên đấu giá trên smart contract.
   - `seller`: Địa chỉ ví người bán.
   - `nft_token_id`: ID của NFT được mang ra đấu giá.
   - `end_time`: Thời gian kết thúc phiên đấu giá.
   - `reserve_price`: Giá khởi điểm/giá tối thiểu.
   - `current_top_bidder`, `current_top_bid`: Người trả giá cao nhất và số tiền trả giá hiện tại.
   - `active`: Trạng thái hoạt động của phiên đấu giá.
   - `asset_type`, `category_code`: Phân loại tài sản (`DIGITAL`/`PHYSICAL`, và mã danh mục).
   - `phase`, `dispute_type`: Giai đoạn hiện tại của phiên đấu giá và loại tranh chấp (nếu có).
   - `location_*`: Thông tin địa điểm giao nhận (áp dụng cho tài sản vật lý).

2. **`bids`**: Lịch sử trả giá của các phiên đấu giá.
   - `auction_id`: ID phiên đấu giá.
   - `bidder`: Địa chỉ ví người trả giá.
   - `amount`: Số tiền trả giá.

3. **`nfts`**: Thông tin về các NFT được đúc trên hệ thống.
   - `token_id`: ID của NFT.
   - `owner`: Địa chỉ chủ sở hữu hiện tại.
   - `token_uri`: Đường dẫn URI chứa metadata của NFT.
   - `name`, `description`, `image`, `attributes`: Các thông tin chi tiết được bóc tách từ metadata để tiện truy vấn.

4. **`asset_categories`**: Danh mục phân loại các vật phẩm đấu giá.
   - `asset_type`: Kiểu tài sản (`DIGITAL` hoặc `PHYSICAL`).
   - `category_code`: Mã danh mục duy nhất (VD: `PHYSICAL_WATCH`).
   - `display_name`, `icon`: Tên hiển thị và icon phục vụ UI.
   - `requires_escrow`: Cờ đánh dấu có bắt buộc yêu cầu giữ tiền (escrow) hay không (thường dùng cho physical).

5. **`user_profiles`**: Hồ sơ người dùng và thống kê uy tín.
   - `wallet_address`: Địa chỉ ví (khoá chính định danh).
   - `display_name`, `avatar_url`, `bio`, `social_links`: Thông tin cá nhân.
   - `is_verified`, `kyc_status`: Trạng thái xác minh danh tính KYC.
   - `total_*`, `successful_deliveries`: Thống kê hoạt động (số lần tạo đấu giá, số bid, bàn giao thành công,...).
   - `reputation_score`: Điểm uy tín (được tính toán tự động dựa trên lịch sử hoạt động).
   - `juror_eligible`, `adf_staked_for_juror`: Đủ điều kiện làm trọng tài và số token ADF đã stake.

6. **`disputes`**: Lưu trữ các vụ tranh chấp giữa người mua và người bán.
   - `dispute_id`, `auction_id`: ID vụ tranh chấp và phiên đấu giá liên đới.
   - `buyer`, `seller`, `initiator`: Các bên liên quan và người khởi xướng khiếu nại.
   - `*_evidence_ipfs`, `*_description`, `*_images`: Bằng chứng do các bên cung cấp.
   - `selected_jurors`: Danh sách địa chỉ ví các trọng tài được chọn ngẫu nhiên.
   - `phase`: Giai đoạn xử lý tranh chấp (`EVIDENCE`, `COMMIT`, `REVEAL`, `RESOLVED`).
   - `*_deadline`: Các mốc thời hạn đối với từng giai đoạn.
   - `buyer_votes`, `seller_votes`, `winner`: Kết quả bỏ phiếu và người chiến thắng.

7. **`dispute_votes`**: Chi tiết phiếu bầu của từng trọng tài trong các vụ tranh chấp.
   - `dispute_id`, `juror`: Trọng tài và vụ tranh chấp tương ứng.
   - `has_committed`, `commit_hash`: Trạng thái đã ẩn phiếu và mã hash của lá phiếu.
   - `has_revealed`, `revealed_vote`: Trạng thái đã công khai phiếu và quyết định (ủng hộ người mua hay người bán).
   - `reward_amount`, `penalty_amount`: Tiền thưởng nhận được hoặc tiền phạt nếu làm trái luật.

8. **`swap_history`**: Lịch sử giao dịch hoán đổi token (qua cơ chế AMM).
   - `user_address`: Người thực hiện hoán đổi.
   - `swap_type`: Hướng hoán đổi (`ETH_TO_ADF` hoặc `ADF_TO_ETH`).
   - `amount_in`, `amount_out`, `fee_collected`: Số token đầu vào, đầu ra và phí giao dịch sàn thu.

9. **`user_transactions`**: Sổ cái ghi nhận mọi giao dịch và biến động số dư.
   - `tx_hash`, `user_address`: Giao dịch và người dùng thực hiện.
   - `tx_type`: Phân loại giao dịch (VD: `SWAP`, `AUCTION_BID`, `ESCROW_RELEASE`, `JUROR_REWARD`...).
   - `amount`, `balance_change`: Số lượng token giao dịch và tác động thay đổi số dư.

10. **`sync_state`**: Bảng phụ trợ của server.
    - `last_synced_block`: Lưu trữ block đã đồng bộ cuối cùng, dùng để tự động quét bù event (catch-up) khi server bị khởi động lại.
