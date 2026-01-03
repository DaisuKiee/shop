import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ThumbnailBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, 'public/uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, `${uniqueSuffix}.${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    }
});

const ROLES = { USER: 'user', STAFF: 'staff', ADMIN: 'admin' };
const PAYMENT_METHODS = {
    GCASH: { id: 'gcash', name: 'GCash', icon: '📱' },
    PAYPAL: { id: 'paypal', name: 'PayPal', icon: '💳' },
    BANK: { id: 'bank', name: 'Bank Transfer', icon: '🏦' }
};

const db = {
    users: new Map(),
    products: [],
    categories: [],
    orders: [],
    pendingOrders: [],
    siteSettings: {
        hero: {
            title: 'AVATAR',
            subtitle: '© 2025 20TH CENTURY STUDIOS',
            buttonText: 'Shop the Collection',
            buttonLink: '/shop',
            backgroundImage: ''
        },
        featuredCollections: [
            { id: 1, title: '✦COSMOS✦', subtitle: '', image: '', bgColor: '#1a1a3e', link: '/shop?category=effects' },
            { id: 2, title: 'WINTER', subtitle: 'WONDERLAND', image: '', bgColor: '#1a3a3a', link: '/shop?category=bundle' }
        ]
    }
};

db.categories = [];

db.products = [];

const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '';
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || '';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || '';

export function startWebServer(client, port = 3000) {
    const app = express();
    
    // Login logging function using Components V2
    const logUserLogin = async (discordUser, role, ip) => {
        if (!LOG_CHANNEL_ID || !client) return;
        
        try {
            const channel = await client.channels.fetch(LOG_CHANNEL_ID);
            if (!channel) return;
            
            const avatar = discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`;
            
            const accountCreatedTimestamp = Number((BigInt(discordUser.id) >> 22n) + 1420070400000n) / 1000;
            
            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2);
            
            // Header with thumbnail
            const headerSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '## 🔐 Website Login\n' +
                        `**User:** ${discordUser.global_name || discordUser.username}\n` +
                        `**Username:** ${discordUser.username}\n` +
                        `**ID:** \`${discordUser.id}\``
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar));
            
            container.addSectionComponents(headerSection);
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            
            // Details section (no accessory needed for plain text display)
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Role:** ${role.toUpperCase()}\n` +
                    `**Account Created:** <t:${Math.floor(accountCreatedTimestamp)}:R>\n` +
                    `**Login Time:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                    `**IP Address:** \`${ip || 'Unknown'}\``
                )
            );
            
            await channel.send({ components: [container], flags: ['IsComponentsV2'] });
        } catch (err) {
            console.error('Error logging login:', err);
        }
    };
    
    // Purchase logging function - logs to channel and DMs user
    const logPurchase = async (order, product, user) => {
        let logMessageId = null;
        
        // Log to channel
        if (LOG_CHANNEL_ID && client) {
            try {
                const channel = await client.channels.fetch(LOG_CHANNEL_ID);
                if (channel) {
                    const container = new ContainerBuilder()
                        .setAccentColor(0xFEE75C);
                    
                    const headerSection = new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                '## 🛒 New Purchase\n' +
                                `**Order ID:** \`${order.orderId}\`\n` +
                                `**Product:** ${product.name}\n` +
                                `**Price:** ₱${product.price}`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(product.previewImage));
                    
                    container.addSectionComponents(headerSection);
                    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                    
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Buyer:** ${user.username}\n` +
                            `**User ID:** \`${user.discordId}\`\n` +
                            `**Payment Method:** ${order.paymentMethod}\n` +
                            `**Payment Proof:** ${order.paymentProof || 'Not provided'}\n` +
                            `**Status:** ⏳ Pending\n` +
                            `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        )
                    );
                    
                    const msg = await channel.send({ components: [container], flags: ['IsComponentsV2'] });
                    logMessageId = msg.id;
                }
            } catch (err) {
                console.error('Error logging purchase:', err);
            }
        }
        
        // DM the user
        if (client) {
            try {
                const discordUser = await client.users.fetch(user.discordId);
                if (discordUser) {
                    const dmContainer = new ContainerBuilder()
                        .setAccentColor(0x5865F2);
                    
                    const headerSection = new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                '## 🎉 Order Placed Successfully!\n' +
                                `Thank you for your purchase!`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(product.previewImage));
                    
                    dmContainer.addSectionComponents(headerSection);
                    dmContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                    
                    dmContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Order ID:** \`${order.orderId}\`\n` +
                            `**Product:** ${product.name}\n` +
                            `**Price:** ₱${product.price}\n` +
                            `**Payment Method:** ${order.paymentMethod}`
                        )
                    );
                    
                    dmContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                    
                    dmContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `⏳ **Status:** Pending Review\n\n` +
                            `-# Your order is being reviewed by our staff. You will receive a DM once it's approved!`
                        )
                    );
                    
                    await discordUser.send({ components: [dmContainer], flags: ['IsComponentsV2'] });
                }
            } catch (err) {
                console.error('Error DMing user:', err);
            }
        }
        
        return logMessageId;
    };
    
    // Check if user has DMs open
    const canDMUser = async (userId) => {
        if (!client) return false;
        try {
            const user = await client.users.fetch(userId);
            await user.send({ content: '_ _' }).then(msg => msg.delete());
            return true;
        } catch (err) {
            return false;
        }
    };
    
    // Update order status in channel log
    const updateOrderLog = async (order, status, staffUsername, productLink = null) => {
        if (!LOG_CHANNEL_ID || !client || !order.logMessageId) return;
        
        try {
            const channel = await client.channels.fetch(LOG_CHANNEL_ID);
            if (!channel) return;
            
            const message = await channel.messages.fetch(order.logMessageId);
            if (!message) return;
            
            const product = db.products.find(p => p.id === order.productId) || { name: order.productName, previewImage: order.productImage };
            const isApproved = status === 'completed';
            
            const container = new ContainerBuilder()
                .setAccentColor(isApproved ? 0x57F287 : 0xED4245);
            
            const headerSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${isApproved ? '✅ Order Approved' : '❌ Order Rejected'}\n` +
                        `**Order ID:** \`${order.orderId}\`\n` +
                        `**Product:** ${product.name}\n` +
                        `**Price:** ₱${order.price}`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(product.previewImage));
            
            container.addSectionComponents(headerSection);
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            
            let statusText = isApproved 
                ? `**Status:** ✅ Approved by ${staffUsername}` 
                : `**Status:** ❌ Rejected by ${staffUsername}\n**Reason:** ${order.reason || 'No reason provided'}`;
            
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Buyer:** ${order.username}\n` +
                    `**User ID:** \`${order.userId}\`\n` +
                    `**Payment Method:** ${order.paymentMethod}\n` +
                    `${statusText}\n` +
                    `**Processed:** <t:${Math.floor(Date.now() / 1000)}:F>`
                )
            );
            
            await message.edit({ components: [container], flags: ['IsComponentsV2'] });
        } catch (err) {
            console.error('Error updating order log:', err);
        }
    };
    
    // Send approval/rejection DM to user
    const sendOrderStatusDM = async (order, status, productLink = null) => {
        if (!client) return false;
        
        try {
            const user = await client.users.fetch(order.userId);
            if (!user) return false;
            
            const product = db.products.find(p => p.id === order.productId) || { name: order.productName, previewImage: order.productImage };
            const isApproved = status === 'completed';
            
            const dmContainer = new ContainerBuilder()
                .setAccentColor(isApproved ? 0x57F287 : 0xED4245);
            
            const headerSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        isApproved 
                            ? '## ✅ Order Approved!\n Your order has been approved and processed.'
                            : '## ❌ Order Rejected\nUnfortunately, your order has been rejected.'
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(product.previewImage));
            
            dmContainer.addSectionComponents(headerSection);
            dmContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            
            dmContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Order ID:** \`${order.orderId}\`\n` +
                    `**Product:** ${product.name}\n` +
                    `**Price:** ₱${order.price}`
                )
            );
            
            if (isApproved && productLink) {
                dmContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                dmContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `🎁 **Your Product Link:**\n${productLink}\n\n` +
                        `-# Thank you for your purchase! Enjoy your product.`
                    )
                );
            } else if (!isApproved) {
                dmContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                dmContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Reason:** ${order.reason || 'No reason provided'}\n\n` +
                        `-# If you believe this is a mistake, please contact our staff.`
                    )
                );
            }
            
            await user.send({ components: [dmContainer], flags: ['IsComponentsV2'] });
            return true;
        } catch (err) {
            console.error('Error sending order status DM:', err);
            return false;
        }
    };
    
    app.set('view engine', 'ejs');
    app.set('views', join(__dirname, 'views'));
    app.use(express.static(join(__dirname, 'public')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
    }));
    
    app.use((req, res, next) => {
        res.locals.user = req.session.user || null;
        res.locals.isLoggedIn = !!req.session.user;
        res.locals.isAdmin = req.session.user?.role === ROLES.ADMIN;
        res.locals.isStaff = req.session.user?.role === ROLES.STAFF || req.session.user?.role === ROLES.ADMIN;
        res.locals.paymentMethods = PAYMENT_METHODS;
        next();
    });
    
    const getBotData = () => ({
        botName: client?.user?.username || 'Discord Shop',
        botAvatar: client?.user?.displayAvatarURL({ size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
        serverCount: client?.guilds?.cache?.size || 0,
        userCount: client?.users?.cache?.size || 0,
        commandCount: client?.commands?.size || 0
    });
    
    const getGuildData = async () => {
        const guildId = process.env.GUILD_ID;
        const defaultData = {
            guildName: 'Discord Server',
            guildIcon: 'https://cdn.discordapp.com/embed/avatars/0.png',
            guildBanner: null,
            guildDescription: '',
            memberCount: 0,
            onlineCount: 0,
            boostLevel: 0,
            boostCount: 0,
            features: []
        };
        
        if (!guildId || !client) {
            return defaultData;
        }
        
        try {
            const guild = await client.guilds.fetch(guildId);
            if (!guild) throw new Error('Guild not found');
            
            // Fetch more detailed guild info
            const guildWithCounts = await guild.fetch();
            
            return {
                guildName: guild.name,
                guildIcon: guild.iconURL({ size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
                guildBanner: guild.bannerURL({ size: 1024 }) || null,
                guildDescription: guild.description || '',
                memberCount: guildWithCounts.approximateMemberCount || guild.memberCount || 0,
                onlineCount: guildWithCounts.approximatePresenceCount || 0,
                boostLevel: guild.premiumTier || 0,
                boostCount: guild.premiumSubscriptionCount || 0,
                features: guild.features || []
            };
        } catch (err) {
            console.error('Error fetching guild:', err);
            return defaultData;
        }
    };
    
    const getUserRole = async (discordId) => {
        try {
            const guildId = process.env.GUILD_ID;
            if (!guildId || !client) return ROLES.USER;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return ROLES.USER;
            const member = await guild.members.fetch(discordId).catch(() => null);
            if (!member) return ROLES.USER;
            if (ADMIN_ROLE_ID && member.roles.cache.has(ADMIN_ROLE_ID)) return ROLES.ADMIN;
            if (STAFF_ROLE_ID && member.roles.cache.has(STAFF_ROLE_ID)) return ROLES.STAFF;
            if (process.env.OWNER_ID && discordId === process.env.OWNER_ID) return ROLES.ADMIN;
            return ROLES.USER;
        } catch { return ROLES.USER; }
    };
    
    const requireAuth = (req, res, next) => { if (!req.session.user) return res.redirect('/login'); next(); };
    const requireStaff = (req, res, next) => { if (!req.session.user || (req.session.user.role !== ROLES.STAFF && req.session.user.role !== ROLES.ADMIN)) return res.status(403).render('error', { ...getBotData(), message: 'Staff only.' }); next(); };
    const requireAdmin = (req, res, next) => { if (!req.session.user || req.session.user.role !== ROLES.ADMIN) return res.status(403).render('error', { ...getBotData(), message: 'Admin only.' }); next(); };
    
    // Discord OAuth2 URLs
    const DISCORD_API = 'https://discord.com/api/v10';
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `http://localhost:${port}/auth/discord/callback`;
    
    const getOAuthUrl = () => {
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'identify'
        });
        return `https://discord.com/api/oauth2/authorize?${params}`;
    };

    // ==================== AUTH ROUTES ====================
    app.get('/login', (req, res) => {
        if (req.session.user) return res.redirect('/');
        res.render('login', { ...getBotData(), page: 'login' });
    });
    
    app.get('/auth/discord', (req, res) => {
        res.redirect(getOAuthUrl());
    });
    
    app.get('/auth/discord/callback', async (req, res) => {
        const { code } = req.query;
        if (!code) return res.redirect('/?error=No code provided');
        
        try {
            // Exchange code for token
            const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: REDIRECT_URI
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) return res.redirect('/?error=Failed to get token');
            
            // Get user info
            const userRes = await fetch(`${DISCORD_API}/users/@me`, {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const discordUser = await userRes.json();
            if (!discordUser.id) return res.redirect('/?error=Failed to get user');
            
            const role = await getUserRole(discordUser.id);
            const avatar = discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`;
            
            const user = {
                id: Date.now(),
                discordId: discordUser.id,
                username: discordUser.global_name || discordUser.username,
                avatar,
                role,
                createdAt: new Date()
            };
            
            // Log the login to Discord channel
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
            if (ip === '::1' || ip === '127.0.0.1') ip = 'localhost';
            await logUserLogin(discordUser, role, ip);
            
            db.users.set(discordUser.id, user);
            req.session.user = user;
            res.redirect('/');
        } catch (err) {
            console.error('OAuth error:', err);
            res.redirect('/?error=Authentication failed');
        }
    });
    
    app.get('/auth/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
    
    // ==================== PUBLIC ROUTES ====================
    app.get('/', async (req, res) => {
        const guildData = await getGuildData();
        res.render('landing', { ...getBotData(), ...guildData, featuredProducts: db.products.slice(0, 4), page: 'home' });
    });
    app.get('/shop/featured', (req, res) => res.render('index', { ...getBotData(), products: db.products, featuredProducts: db.products.filter(p => p.popular || p.discount).slice(0, 4), collections: db.categories, siteSettings: db.siteSettings, page: 'featured' }));
    
    app.get('/explore', (req, res) => {
        const category = req.query.category || 'all';
        const search = req.query.search || '';
        let filtered = [...db.products];
        if (category !== 'all') filtered = filtered.filter(p => p.category === category || p.type === category);
        if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
        res.render('explore', { ...getBotData(), products: filtered, allProducts: db.products, category, search, page: 'explore' });
    });
    
    app.get('/shop', (req, res) => {
        const category = req.query.category || 'all';
        const filtered = category === 'all' ? db.products : db.products.filter(p => p.category === category || p.type === category);
        res.render('shop', { ...getBotData(), products: filtered, allProducts: db.products, categories: [{ id: 'all', name: 'All Products' }, ...db.categories.map(c => ({ id: c.slug, name: c.name }))], currentCategory: category, page: 'shop' });
    });
    
    app.get('/product/:id', (req, res) => {
        const product = db.products.find(p => p.id === parseInt(req.params.id));
        if (!product) return res.redirect('/shop');
        const relatedProducts = db.products.filter(p => p.id !== product.id && (p.category === product.category || p.type === product.type)).slice(0, 4);
        res.render('product', { ...getBotData(), product, relatedProducts, paymentMethods: Object.values(PAYMENT_METHODS), page: 'product' });
    });

    // ==================== USER ROUTES ====================
    app.get('/checkout/:id', requireAuth, (req, res) => {
        const product = db.products.find(p => p.id === parseInt(req.params.id));
        if (!product) return res.redirect('/shop');
        res.render('checkout', { ...getBotData(), product, paymentMethods: Object.values(PAYMENT_METHODS), page: 'checkout' });
    });
    
    app.post('/api/purchase/:id', requireAuth, async (req, res) => {
        const product = db.products.find(p => p.id === parseInt(req.params.id));
        const user = req.session.user;
        const { paymentMethod, paymentProof } = req.body;
        
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        if (product.stock <= 0) return res.status(400).json({ success: false, error: 'Out of stock' });
        if (!paymentMethod) return res.status(400).json({ success: false, error: 'Select payment method' });
        
        const order = {
            id: Date.now(),
            orderId: `ORD-${Date.now()}`,
            userId: user.discordId,
            username: user.username,
            productId: product.id,
            productName: product.name,
            productImage: product.previewImage,
            price: product.price,
            paymentMethod: paymentMethod.toUpperCase(),
            paymentProof: paymentProof || null,
            status: 'pending',
            createdAt: new Date()
        };
        
        db.pendingOrders.push(order);
        product.stock -= 1;
        
        // Log purchase to channel and DM user
        const logMessageId = await logPurchase(order, product, user);
        order.logMessageId = logMessageId;
        
        res.json({ success: true, order, message: 'Order placed! Wait for staff approval.' });
    });
    
    app.get('/my-orders', requireAuth, (req, res) => {
        const userOrders = [...db.pendingOrders, ...db.orders].filter(o => o.userId === req.session.user.discordId);
        res.render('my-orders', { ...getBotData(), orders: userOrders, page: 'my-orders' });
    });
    
    // ==================== STAFF ROUTES ====================
    app.get('/staff', requireStaff, (req, res) => res.render('staff/dashboard', { ...getBotData(), pendingOrders: db.pendingOrders, completedOrders: db.orders, paymentMethods: PAYMENT_METHODS, page: 'staff' }));
    
    // Check if user can receive DMs
    app.get('/api/staff/check-dm/:userId', requireStaff, async (req, res) => {
        const canDM = await canDMUser(req.params.userId);
        res.json({ success: true, canDM });
    });
    
    app.post('/api/staff/approve/:orderId', requireStaff, async (req, res) => {
        const orderIndex = db.pendingOrders.findIndex(o => o.id === parseInt(req.params.orderId));
        if (orderIndex === -1) return res.status(404).json({ success: false, error: 'Order not found' });
        
        const { productLink } = req.body;
        if (!productLink) return res.status(400).json({ success: false, error: 'Product link is required' });
        
        const order = db.pendingOrders[orderIndex];
        
        // Check if user can receive DMs before approving
        const canDM = await canDMUser(order.userId);
        if (!canDM) {
            return res.status(400).json({ success: false, error: 'Cannot DM user. They may have DMs closed. Please ask them to open DMs first.' });
        }
        
        // Remove from pending and update status
        db.pendingOrders.splice(orderIndex, 1);
        order.status = 'completed';
        order.completedAt = new Date();
        order.completedBy = req.session.user.username;
        order.productLink = productLink;
        
        const product = db.products.find(p => p.id === order.productId);
        if (product) product.sold = (product.sold || 0) + 1;
        db.orders.push(order);
        
        // Update channel log and send DM
        await updateOrderLog(order, 'completed', req.session.user.username, productLink);
        await sendOrderStatusDM(order, 'completed', productLink);
        
        res.json({ success: true, order });
    });
    
    app.post('/api/staff/reject/:orderId', requireStaff, async (req, res) => {
        const orderIndex = db.pendingOrders.findIndex(o => o.id === parseInt(req.params.orderId));
        if (orderIndex === -1) return res.status(404).json({ success: false, error: 'Order not found' });
        
        const order = db.pendingOrders.splice(orderIndex, 1)[0];
        const product = db.products.find(p => p.id === order.productId);
        if (product) product.stock += 1;
        order.status = 'rejected';
        order.rejectedAt = new Date();
        order.rejectedBy = req.session.user.username;
        order.reason = req.body.reason || 'No reason provided';
        db.orders.push(order);
        
        // Update channel log and send DM
        await updateOrderLog(order, 'rejected', req.session.user.username);
        await sendOrderStatusDM(order, 'rejected');
        
        res.json({ success: true, order });
    });
    
    // Staff orders stats API for real-time updates
    app.get('/api/staff/orders', requireStaff, (req, res) => {
        res.json({
            success: true,
            pendingCount: db.pendingOrders.length,
            completedCount: db.orders.filter(o => o.status === 'completed').length,
            rejectedCount: db.orders.filter(o => o.status === 'rejected').length
        });
    });

    // ==================== ADMIN ROUTES ====================
    app.get('/admin', requireAdmin, (req, res) => res.render('admin/dashboard', { ...getBotData(), products: db.products, categories: db.categories, pendingOrders: db.pendingOrders, completedOrders: db.orders, users: Array.from(db.users.values()), stats: { totalProducts: db.products.length, totalCategories: db.categories.length, totalOrders: db.orders.length + db.pendingOrders.length, pendingOrders: db.pendingOrders.length, totalRevenue: db.orders.reduce((sum, o) => sum + o.price, 0), totalUsers: db.users.size }, page: 'admin' }));
    
    app.get('/admin/products', requireAdmin, (req, res) => res.render('admin/products', { ...getBotData(), products: db.products, categories: db.categories, page: 'admin-products' }));
    
    app.post('/api/admin/products', requireAdmin, (req, res) => {
        const { name, description, price, originalPrice, discount, category, type, stock, image } = req.body;
        if (!name || !price || !category) return res.status(400).json({ success: false, error: 'Name, price, category required' });
        const newProduct = { id: db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1, name, description: description || '', price: parseFloat(price), originalPrice: originalPrice ? parseFloat(originalPrice) : null, discount: discount ? parseInt(discount) : null, category, type: type || 'avatar_decoration', stock: parseInt(stock) || 0, sold: 0, image: image || 'https://cdn.discordapp.com/embed/avatars/0.png', previewImage: image || 'https://cdn.discordapp.com/embed/avatars/0.png', createdAt: new Date() };
        db.products.push(newProduct);
        res.json({ success: true, product: newProduct });
    });
    
    app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
        const product = db.products.find(p => p.id === parseInt(req.params.id));
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        const { name, description, price, originalPrice, discount, category, type, stock, image } = req.body;
        if (name) product.name = name;
        if (description !== undefined) product.description = description;
        if (price) product.price = parseFloat(price);
        if (originalPrice !== undefined) product.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
        if (discount !== undefined) product.discount = discount ? parseInt(discount) : null;
        if (category) product.category = category;
        if (type) product.type = type;
        if (stock !== undefined) product.stock = parseInt(stock);
        if (image) { product.image = image; product.previewImage = image; }
        res.json({ success: true, product });
    });
    
    app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
        const index = db.products.findIndex(p => p.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ success: false, error: 'Product not found' });
        db.products.splice(index, 1);
        res.json({ success: true });
    });
    
    app.patch('/api/admin/products/:id/stock', requireAdmin, (req, res) => {
        const product = db.products.find(p => p.id === parseInt(req.params.id));
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        product.stock = parseInt(req.body.stock) || 0;
        res.json({ success: true, product });
    });
    
    app.get('/admin/categories', requireAdmin, (req, res) => res.render('admin/categories', { ...getBotData(), categories: db.categories, page: 'admin-categories' }));
    
    app.post('/api/admin/categories', requireAdmin, (req, res) => {
        const { name, slug } = req.body;
        if (!name || !slug) return res.status(400).json({ success: false, error: 'Name and slug required' });
        const newCategory = { id: db.categories.length > 0 ? Math.max(...db.categories.map(c => c.id)) + 1 : 1, name, slug: slug.toLowerCase().replace(/\s+/g, '-') };
        db.categories.push(newCategory);
        res.json({ success: true, category: newCategory });
    });
    
    app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
        const index = db.categories.findIndex(c => c.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ success: false, error: 'Category not found' });
        db.categories.splice(index, 1);
        res.json({ success: true });
    });
    
    // Site Settings Routes
    app.get('/admin/settings', requireAdmin, (req, res) => {
        res.render('admin/settings', { ...getBotData(), settings: db.siteSettings, page: 'admin-settings' });
    });
    
    app.get('/api/admin/settings', requireAdmin, (req, res) => {
        res.json({ success: true, settings: db.siteSettings });
    });
    
    app.put('/api/admin/settings/hero', requireAdmin, (req, res) => {
        const { title, subtitle, buttonText, buttonLink, backgroundImage } = req.body;
        if (title !== undefined) db.siteSettings.hero.title = title;
        if (subtitle !== undefined) db.siteSettings.hero.subtitle = subtitle;
        if (buttonText !== undefined) db.siteSettings.hero.buttonText = buttonText;
        if (buttonLink !== undefined) db.siteSettings.hero.buttonLink = buttonLink;
        if (backgroundImage !== undefined) db.siteSettings.hero.backgroundImage = backgroundImage;
        res.json({ success: true, hero: db.siteSettings.hero });
    });
    
    app.put('/api/admin/settings/collections', requireAdmin, (req, res) => {
        const { collections } = req.body;
        if (collections && Array.isArray(collections)) {
            db.siteSettings.featuredCollections = collections.map((c, i) => ({
                id: i + 1,
                title: c.title || '',
                subtitle: c.subtitle || '',
                image: c.image || '',
                bgColor: c.bgColor || '#1a1a3e',
                link: c.link || '/shop'
            }));
        }
        res.json({ success: true, collections: db.siteSettings.featuredCollections });
    });
    
    app.post('/api/admin/settings/collections', requireAdmin, (req, res) => {
        const { title, subtitle, image, bgColor, link } = req.body;
        const newCollection = {
            id: db.siteSettings.featuredCollections.length > 0 ? Math.max(...db.siteSettings.featuredCollections.map(c => c.id)) + 1 : 1,
            title: title || 'New Collection',
            subtitle: subtitle || '',
            image: image || '',
            bgColor: bgColor || '#1a1a3e',
            link: link || '/shop'
        };
        db.siteSettings.featuredCollections.push(newCollection);
        res.json({ success: true, collection: newCollection });
    });
    
    app.delete('/api/admin/settings/collections/:id', requireAdmin, (req, res) => {
        const index = db.siteSettings.featuredCollections.findIndex(c => c.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ success: false, error: 'Collection not found' });
        db.siteSettings.featuredCollections.splice(index, 1);
        res.json({ success: true });
    });
    
    // File upload endpoint
    app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, url: imageUrl });
    });
    
    // ==================== API ROUTES ====================
    app.get('/api/products', (req, res) => {
        let products = [...db.products];
        if (req.query.category && req.query.category !== 'all') products = products.filter(p => p.category === req.query.category);
        if (req.query.search) products = products.filter(p => p.name.toLowerCase().includes(req.query.search.toLowerCase()));
        res.json({ success: true, products });
    });
    app.get('/api/products/:id', (req, res) => { const p = db.products.find(p => p.id === parseInt(req.params.id)); p ? res.json({ success: true, product: p }) : res.status(404).json({ success: false, error: 'Not found' }); });
    app.get('/api/categories', (req, res) => res.json({ success: true, categories: db.categories }));
    app.get('/api/me', (req, res) => req.session.user ? res.json({ success: true, user: req.session.user }) : res.status(401).json({ success: false, error: 'Not logged in' }));
    
    app.get('/error', (req, res) => res.render('error', { ...getBotData(), message: req.query.message || 'An error occurred' }));
    app.use((req, res) => res.status(404).render('error', { ...getBotData(), message: 'Page not found' }));
    
    app.listen(port, () => console.log(`🌐 Web server running on http://localhost:${port}`));
    return app;
}
