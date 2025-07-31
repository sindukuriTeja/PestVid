# 🎥 PestiVid Video Testing Guide

## 🎯 **Video Playback System Overview**

Your PestiVid application now has a robust video playback system:

- **🎥 Videos**: Stored on IPFS (decentralized file storage)
- **📊 Metadata**: Stored on Avalanche blockchain
- **🔄 Multiple Gateways**: Automatic fallback for reliability
- **⚡ Smart Loading**: Progressive loading with error handling

---

## 🧪 **Testing Video Playback**

### **Method 1: Use Test File**
1. Open `test-blockchain.html` in your browser
2. Click "4. Test Video Playback"
3. Watch videos load from IPFS

### **Method 2: Test in Main App**
1. Open `fullstack.html`
2. Go to "AgriStream" section
3. Demo videos should load automatically

### **Method 3: Upload Your Own Video**
1. Go to Dashboard
2. Record a video
3. Upload to IPFS (needs Pinata API key)
4. Video appears in AgriStream

---

## 🔧 **Video System Features**

### **✅ Multiple IPFS Gateways**
The app tries these gateways in order:
1. **Pinata Gateway** (your custom gateway)
2. **IPFS.io** (public gateway)
3. **Cloudflare IPFS** (fast CDN)
4. **Dweb.link** (Protocol Labs)
5. **Gateway.ipfs.io** (fallback)

### **✅ Smart Loading States**
- **Loading**: Shows spinner while video loads
- **Playing**: Video ready and playable
- **Error**: Shows retry button if loading fails
- **IPFS Indicator**: Shows videos are from IPFS

### **✅ Video Format Support**
- **WebM**: Primary format (recorded videos)
- **MP4**: Fallback format
- **OGG**: Additional support
- **Auto-detection**: Based on file extension

---

## 🎬 **How Video Storage Works**

### **Upload Process:**
```
1. User records video
   ↓
2. Video uploaded to IPFS via Pinata
   ↓
3. IPFS returns CID (Content Identifier)
   ↓
4. CID + metadata stored on blockchain
   ↓
5. Video accessible via: https://gateway/ipfs/{CID}
```

### **Playback Process:**
```
1. Load metadata from blockchain
   ↓
2. Get video CID from metadata
   ↓
3. Try loading from primary gateway
   ↓
4. If fails, try alternative gateways
   ↓
5. Display video with controls
```

---

## 🔍 **Testing Checklist**

### **✅ Basic Playback**
- [ ] Videos load in AgriStream
- [ ] Video controls work (play/pause/seek)
- [ ] Loading indicators appear
- [ ] IPFS indicators show

### **✅ Error Handling**
- [ ] Retry button appears on error
- [ ] Alternative gateways tried
- [ ] Graceful fallback behavior

### **✅ Upload & Storage**
- [ ] Video recording works
- [ ] Upload to IPFS succeeds
- [ ] Metadata stored on blockchain
- [ ] Video appears in AgriStream

### **✅ Cross-Platform**
- [ ] Works on desktop browsers
- [ ] Works on mobile devices
- [ ] Video formats supported

---

## 🚨 **Troubleshooting**

### **Videos Not Loading**
1. **Check Network**: Ensure internet connection
2. **Try Different Gateway**: IPFS gateways can be slow
3. **Check CID**: Verify the IPFS CID is valid
4. **Browser Console**: Look for error messages

### **Upload Failures**
1. **Pinata API Key**: Verify JWT token is correct
2. **File Size**: Large videos may timeout
3. **Network**: Check upload bandwidth
4. **Browser Support**: Ensure WebRTC support

### **Blockchain Issues**
1. **MetaMask**: Ensure wallet connected
2. **Network**: Verify on correct network (Fuji)
3. **Gas Fees**: Ensure sufficient AVAX balance
4. **Contract**: Verify contract address correct

---

## 📊 **Performance Tips**

### **For Better Video Loading:**
- **Use Multiple Sources**: App automatically tries multiple gateways
- **Preload Metadata**: Videos load metadata first
- **Progressive Loading**: Only load when needed
- **Error Recovery**: Automatic retry on failure

### **For Better Upload:**
- **Compress Videos**: Smaller files upload faster
- **Stable Connection**: Use reliable internet
- **Pinata Pro**: Consider paid Pinata plan for better performance

---

## 🎯 **Real-World Testing**

### **Test with Real Videos:**
1. **Record Farm Video**: Use phone/camera
2. **Upload via Dashboard**: Test full flow
3. **Share with Others**: Test community features
4. **Check Blockchain**: Verify on Snowtrace

### **Test Different Scenarios:**
- **Poor Network**: Test with slow connection
- **Different Devices**: Mobile vs desktop
- **Different Browsers**: Chrome, Firefox, Safari
- **Different Video Lengths**: Short vs long videos

---

## 🎉 **Success Indicators**

When everything works correctly:
- ✅ Videos load smoothly from IPFS
- ✅ Multiple gateway fallback works
- ✅ Loading states show properly
- ✅ Error handling works gracefully
- ✅ Blockchain metadata verified
- ✅ Community features functional

---

## 🔗 **Useful Links**

- **IPFS Gateway Status**: https://ipfs.github.io/public-gateway-checker/
- **Pinata Dashboard**: https://app.pinata.cloud/
- **Avalanche Explorer**: https://testnet.snowtrace.io/
- **Video Format Info**: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video

---

## 💡 **Pro Tips**

1. **Test Early**: Test video playback before full deployment
2. **Monitor Performance**: Watch for slow-loading videos
3. **User Feedback**: Ask users about video quality
4. **Gateway Health**: Monitor IPFS gateway status
5. **Backup Plans**: Always have fallback options

**Your videos are now truly decentralized and permanent!** 🌱📹⛓️
