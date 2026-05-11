// 根据商品图片名获取商家编号
// 例如：P000200001.jpg => M000000002
function getMerchantIdByProductImageName(imgName) {
    // 提取商品ID前缀（如P00010000123）
    const match = imgName.match(/(P\d{9,})/); // 支持10位及以上
    if (!match) return '';
    const productId = match[1]; // P00010000123
    // 取第2~5位作为商家编号后四位
    const merchantSuffix = productId.slice(1, 5); // 0001
    // 商家ID前面补5个0
    const merchantId = 'M' + '00000' + merchantSuffix;
    return merchantId;
}

function renderMerchantImages(imageList,folderName) {
    const container = document.getElementById('merchant-images');
    // container.innerHTML = '';

    // 只移除旧的商家块，防止将弹窗和遮罩层被删除，同时防止切换多个商家页面餐品堆得越来越长
    document.querySelectorAll('#merchant-images .merchant-block').forEach(el => el.remove());
    
    imageList.forEach(imgName => {
        const html = `
        <div class="merchant-block">
          <div class="pos-theme-list-sell-image" 
                style="background-image: url('../../Merchant/Merchants/${folderName}/${imgName}')" 
                data-img="${imgName}"
                data-folder="${folderName}"
                data-product-Id="${imgName.replace(/\.\w+$/,'')}">
            <img src="../images/icons/bookmark.svg" alt="" class="bookmark-icon">
            <span class="bookmark-num">89.1K</span>
            <div class="label-start-selling-time-container">
              <img src="../images/icons/start-selling-time-label.svg" alt="">
              <div class="start-selling-time">12:00</div>
            </div>
            <div class="label-close-time-container">
              <img src="../images/icons/门店打烊.png" alt="打烊" style="width:25px;height:25px;margin-right:6px;">
              <div class="close-time" style="font-size:13px;color:#3e3e3e;">22:00</div>
            </div>
          </div>
          <div class="pos-theme-list-sell-info">
              <div class="merchant-text-info">
                  <span class="pos-theme-list-sell-info-name"></span>
                  <span class="pos-theme-list-sell-info-address">
                      <span class="merchant-address"></span>
                      <span class="special-typefood"></span>
                  </span>
                  <div class="food-brief-evaluate-emoji-container">
                      <img src="../images/icons/thumbs-up.svg" alt="" class="yammy-icon">
                      <span class="good-review-num" style="margin: 0 5px;">0</span>
                      <img src="../images/icons/thumbs-down.svg" alt="" class="dame-icon">
                      <span class="bad-review-num" style="margin-left: 5px;">0</span>
                  </div>
              </div>
              <button class="ordering-click" data-product-id="${imgName.replace(/\.\w+$/, '')}">立即点餐</button>
          </div>
        </div>
      `;
      const wrap = document.createElement('div');
      wrap.className = 'merchant-block';
      wrap.innerHTML = html;
      container.appendChild(wrap);
    });
  
    // 渲染每个商品块，并批量填充每个图片块的信息
    document.querySelectorAll('.merchant-block').forEach(block => {
      const imgName = block.querySelector('.pos-theme-list-sell-image').dataset.img;
      const merchantId = getMerchantIdByProductImageName(imgName);
      const producitId=imgName.replace(/\.\w+$/,'');
      // 获取商家名
      fetch(`http://localhost:3000/api/getMerchantName?merchant_id=${merchantId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            block.querySelector('.pos-theme-list-sell-info-name').textContent = data.merchant_name;
            setSpecialTypeFood(data.merchant_name, block);
          }
        });
  
      // 获取营业时间
      fetch(`http://localhost:3000/api/getMerchantBusinessHours?merchant_id=${merchantId}`)
        .then(res => res.json())
        .then(data => {
        if (data.success) {
            block.querySelector('.start-selling-time').textContent = data.data.opening_time.slice(0,5);
            block.querySelector('.close-time').textContent = data.data.closing_time.slice(0,5);
        }
        });
  
      // 获取地址
      fetch(`http://localhost:3000/api/getMerchantAddress?merchant_id=${merchantId}`)
        .then(res => res.json())
        .then(data => {
        if (data.success) {
            block.querySelector('.merchant-address').textContent = data.merchant_address;
        }
        });

      // 获取商品点击量
      console.log(imgName);
      fetch(`http://localhost:3000/api/getProductClickCount?product_id=${producitId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          block.querySelector('.bookmark-num').textContent = data.click_count;
        }
      });
      // 获取好评数
      fetch(`http://localhost:3000/api/getProductGoodRvCount?product_id=${producitId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            block.querySelector('.good-review-num').textContent = data.good_review_count;
          }
        });
      // 获取差评数
      fetch(`http://localhost:3000/api/getProductBadRvCount?product_id=${producitId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            block.querySelector('.bad-review-num').textContent = data.bad_review_count;
          }
        });
    });
  }
  
// setSpecialTypeFood 需要支持传入 block，避免全局唯一
function setSpecialTypeFood(merchantName, block) {
    const specialTypeFoodMap = {
    '百乐中心': '/泰国菜/正宗泰式风味...',
    '璃月小馆':'/璃月菜/地道家常味...',
    '幸屋':'/日本菜/精致料理...',
    '肯德基':'/快餐/快快块...'
    };
    const specialTypeFood = specialTypeFoodMap[merchantName] || '/其他';
    block.querySelector('.special-typefood').textContent = specialTypeFood;
}


document.getElementById('merchant-images').addEventListener('click', function(e) {
    const productId=e.target.dataset.productId;
    if (e.target.classList.contains('pos-theme-list-sell-image')) {
        const imgName = e.target.dataset.img;
        const folderName = e.target.dataset.folder;

        fetch('http://localhost:3000/api/incrementProductClickCount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 成功后再获取最新点击量并更新页面
                fetch(`http://localhost:3000/api/getProductClickCount?product_id=${productId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        // 找到当前图片块的 .bookmark-num 并更新
                        e.target.querySelector('.bookmark-num').textContent = data.click_count;
                    }
                });
            }
        });
        const imgUrl = `../../Merchant/Merchants/${folderName}/${imgName}`;
        showImagePreview(imgUrl);
        return;
    }
    if (e.target.classList.contains('ordering-click')) {
        showPayPopup(productId);
    }
});

function showImagePreview(imgUrl) {
  // 创建遮罩和图片预览容器
  let mask = document.createElement('div');
  mask.style.position = 'fixed';
  mask.style.left = 0;
  mask.style.top = 0;
  mask.style.width = '100vw';
  mask.style.height = '100vh';
  mask.style.background = 'rgba(0,0,0,0.7)';
  mask.style.zIndex = 9999;
  mask.style.display = 'flex';
  mask.style.alignItems = 'center';
  mask.style.justifyContent = 'center';

  let img = document.createElement('img');
  img.src = imgUrl;
  img.style.maxWidth = '80vw';
  img.style.maxHeight = '80vh';
  img.style.borderRadius = '10px';
  img.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
  img.style.background = '#fff';

  mask.appendChild(img);

  // 点击遮罩关闭
  mask.addEventListener('click', function() {
      document.body.removeChild(mask);
  });

  document.body.appendChild(mask);
}


