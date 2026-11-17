---
name: laravel-best-practices
description: 'Enforce modern PHP 8.3+ and Laravel 11 best practices for code generation and bug fixes. Use when writing or refactoring Laravel applications, ensuring clean architecture, SOLID principles, meaningful naming, proper separation of concerns, security, and maintainable design patterns.'
argument-hint: 'Optional: specific domain focus (e.g., "controller action", "service class", "API resource", "job", "migration")'
user-invocable: true
---

# Laravel Best Practices Skill

## When to Use

- **Writing new Laravel/PHP code** to ensure clean, maintainable, and secure implementation
- **Building features** (controllers, services, models, jobs, events, etc.)
- **Fixing bugs** while improving code structure and adherence to standards
- **Refactoring existing code** to improve quality, testability, and maintainability
- **Security-critical code** where input validation and authorization matter
- **API development** with proper resources and response formats
- **Database work** with migrations, models, and queries

## Core Principles

### 1. Design & Coding Fundamentals

| Principle | Application |
|-----------|-------------|
| **KISS** (Keep It Simple, Stupid) | Avoid over-engineering; leverage Laravel's built-in features. Prefer conventions over configuration. |
| **DRY** (Don't Repeat Yourself) | Extract duplicated logic into traits, helpers, or base classes. Use Laravel's reusable components. |
| **YAGNI** (You Aren't Gonna Need It) | Don't add features, methods, or middleware "just in case." Implement only what's needed now. |
| **SOLID Principles** | Follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. |
| **Self-Explanatory Naming** | Use clear, descriptive names for classes, methods, variables that reveal intent without comments. |

### 2. Modern PHP 8.3+

**Always prefer modern syntax:**

```php
// ❌ Avoid
if (!isset($user) || !$user->isActive()) {
    return false;
}

$config = array_merge($defaults, $config ?? array());

class UserController extends Controller {
    public function __construct() {
        $this->middleware('auth');
    }
}

// ✅ Prefer
if ($user?->isActive() !== true) {
    return false;
}

$config = [...$defaults, ...$config ?? []];

class UserController extends Controller {
    public function __construct(private UserService $userService) {}
}
```

**Key PHP 8.3+ features to use:**

- **Constructor property promotion** — Declare and assign properties in one line
- **Named arguments** — Call functions with clarity: `User::create(name: $name, email: $email)`
- **Match expressions** — Type-safe alternative to switch: `match($status) { 'active' => ..., }`
- **Attributes** — Use for metadata: `#[Validate('email')]`, `#[Authorize('update')]`
- **Null-safe operator** (`?.`) — Safely chain calls: `$user?->profile?->address?->city`
- **First-class callable syntax** — Pass methods as callables: `$callback = $user->getData(...)`
- **Union/intersection types** — Type safety: `function process(User|Admin $person): User&ActiveInterface`
- **Readonly properties** — Immutability: `public readonly string $name`
- **Enums** — Type-safe constants: `enum Status { case ACTIVE; case INACTIVE; }`

### 3. Laravel 11 Architecture

#### Service Container & Dependency Injection

```php
// ❌ Avoid - hardcoded dependencies
class OrderController extends Controller {
    public function store(Request $request) {
        $paymentGateway = new StripePaymentGateway();
        $emailService = new SmtpEmailService();
        $order = Order::create($request->validated());
        
        $paymentGateway->charge($order->total);
        $emailService->sendConfirmation($order);
        return $order;
    }
}

// ✅ Prefer - inject dependencies
class OrderController extends Controller {
    public function store(
        Request $request,
        OrderService $orderService,
    ) {
        $order = $orderService->processOrder($request->validated());
        return OrderResource::make($order);
    }
}

// In AppServiceProvider or using automatic resolution:
$this->app->bind(PaymentGateway::class, StripePaymentGateway::class);
$this->app->bind(EmailService::class, SmtpEmailService::class);
```

#### Service Layer Pattern

```php
// ✅ Clean separation: Controller → Service → Repository
class OrderController extends Controller {
    public function __construct(private OrderService $orderService) {}
    
    public function store(StoreOrderRequest $request) {
        $order = $this->orderService->createOrder($request->validated());
        return OrderResource::make($order);
    }
}

class OrderService {
    public function __construct(
        private OrderRepository $repository,
        private PaymentGateway $paymentGateway,
        private OrderNotificationService $notifications,
    ) {}
    
    public function createOrder(array $data): Order {
        $this->validateOrderData($data);
        
        $order = $this->repository->create($data);
        
        try {
            $payment = $this->paymentGateway->charge($order);
            $order->markAsPaid($payment);
        } catch (PaymentFailedException $e) {
            $order->markAsFailed($e->getMessage());
            throw $e;
        }
        
        $this->notifications->sendConfirmation($order);
        return $order;
    }
    
    private function validateOrderData(array $data): void {
        throw_if(
            empty($data['items']),
            ValidationException::class,
            'Order must contain at least one item'
        );
    }
}

class OrderRepository {
    public function create(array $data): Order {
        return Order::create([
            'user_id' => auth()->id(),
            'total' => $data['total'],
            'status' => OrderStatus::PENDING,
            'items' => $data['items'],
        ]);
    }
}
```

#### Eloquent Best Practices

```php
// ❌ Avoid - N+1 queries, over-fetching
class UserController extends Controller {
    public function index() {
        $users = User::all(); // No eager loading
        return $users->map(fn($user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'posts_count' => $user->posts()->count(), // N+1 query!
            'comments_count' => $user->comments()->count(), // N+1 query!
        ]);
    }
}

// ✅ Prefer - eager loading, explicit columns, proper resources
class UserController extends Controller {
    public function index(Request $request) {
        $users = User::query()
            ->select(['id', 'name', 'email'])
            ->withCount(['posts', 'comments'])
            ->paginate($request->input('per_page', 15));
        
        return UserResource::collection($users);
    }
}

// Or with custom query scopes:
class User extends Model {
    public function scopeWithStats(Builder $query): Builder {
        return $query
            ->select(['id', 'name', 'email'])
            ->withCount(['posts', 'comments']);
    }
}

// Usage:
User::withStats()->paginate();
```

### 4. Clean Code & Maintainability

#### Meaningful Naming

```php
// ❌ Avoid
public function p() {
    $users = DB::table('users')->where('s', 1)->get();
    return $users->filter(fn($u) => $u->c > 10);
}

// ✅ Prefer
public function getActiveUsersWithMinimumOrderCount(int $minimumOrders = 10): Collection {
    return User::query()
        ->where('status', UserStatus::ACTIVE)
        ->withCount('orders')
        ->having('orders_count', '>=', $minimumOrders)
        ->get();
}

// Method naming conventions:
// - get* : retrieve data
// - create* : instantiate new objects
// - process* : transform or handle
// - handle* : respond to events
// - send* : dispatch notifications/messages
// - validate* : check and throw on failure
// - check* : return boolean
// - calculate* : compute values
```

#### Single Responsibility

```php
// ❌ Avoid - God controller
class UserController extends Controller {
    public function store(Request $request) {
        // Validates
        $validated = $request->validate([...]);
        
        // Creates user
        $user = User::create($validated);
        
        // Sends email
        Mail::send(new WelcomeEmail($user));
        
        // Logs
        Log::info('User created', ['user_id' => $user->id]);
        
        // Generates token
        $token = $user->createToken('api')->plainTextToken;
        
        return response()->json([...]);
    }
}

// ✅ Prefer - focused responsibilities
class UserController extends Controller {
    public function __construct(private UserService $userService) {}
    
    public function store(StoreUserRequest $request) {
        $user = $this->userService->register($request->validated());
        return UserResource::make($user);
    }
}

class UserService {
    public function __construct(
        private UserRepository $repository,
        private AuthTokenService $tokenService,
        private UserNotificationService $notifications,
    ) {}
    
    public function register(array $data): User {
        $user = $this->repository->createUser($data);
        $this->notifications->sendWelcome($user);
        return $user;
    }
}

class AuthTokenService {
    public function generateApiToken(User $user): string {
        return $user->createToken('api')->plainTextToken;
    }
}

class UserRepository {
    public function createUser(array $data): User {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
    }
}
```

### 5. Security & Input Validation

#### Request Validation

```php
// ❌ Avoid - validating in controller
public function store(Request $request) {
    $this->validate($request, [
        'email' => 'required|email|unique:users',
        'password' => 'required|min:12|confirmed',
    ]);
}

// ✅ Prefer - use Form Requests
class StoreUserRequest extends FormRequest {
    public function authorize(): bool {
        return true; // Or: return auth()->user()?->isAdmin() ?? false;
    }
    
    public function rules(): array {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:12', 'confirmed', new StrongPassword()],
            'terms' => ['accepted'],
        ];
    }
    
    public function messages(): array {
        return [
            'password.min' => 'Password must be at least 12 characters for security',
        ];
    }
}

class StoreUserController extends Controller {
    public function store(StoreUserRequest $request) {
        // $request->validated() is already validated and safe
        $user = User::create($request->validated());
        return UserResource::make($user);
    }
}
```

#### Sanitization & Protection

```php
// ❌ Avoid - trusting user input
public function search(Request $request) {
    $query = $request->input('q'); // Don't trust this!
    $users = DB::select("SELECT * FROM users WHERE name LIKE '%" . $query . "%'");
    return $users;
}

// ✅ Prefer - sanitize and use parameterized queries
public function search(SearchRequest $request) {
    $query = $request->validated('q');
    
    // Laravel automatically parameterizes queries
    $users = User::query()
        ->where('name', 'like', "%{$query}%")
        ->orWhere('email', 'like', "%{$query}%")
        ->limit(50)
        ->get();
    
    return UserResource::collection($users);
}

// Sanitize HTML output in Blade:
<!-- ❌ Avoid -->
{{ $userInput }} <!-- Outputs raw HTML/script -->

<!-- ✅ Prefer -->
{{ e($userInput) }} <!-- Escapes HTML entities -->
{!! $trustedHtml !!} <!-- Only for trusted content -->
```

#### Authorization

```php
// ❌ Avoid - no authorization
public function update(Request $request, Post $post) {
    $post->update($request->validated());
    return $post;
}

// ✅ Prefer - explicit authorization checks
public function update(UpdatePostRequest $request, Post $post) {
    $this->authorize('update', $post); // Or use middleware
    
    $post->update($request->validated());
    return PostResource::make($post);
}

// Or using policies:
class PostPolicy {
    public function update(User $user, Post $post): bool {
        return $user->id === $post->author_id;
    }
}

// In controller:
public function update(UpdatePostRequest $request, Post $post) {
    if (! auth()->user()->can('update', $post)) {
        abort(403, 'Unauthorized');
    }
    
    $post->update($request->validated());
    return PostResource::make($post);
}
```

### 6. Error Handling & Logging

#### Explicit Error Handling

```php
// ❌ Avoid - silent failures
public function fetchUserFromApi(int $userId): ?User {
    try {
        $response = Http::get("https://api.example.com/users/{$userId}");
        return $response->json();
    } catch (Exception $e) {
        // Error silently swallowed
        return null;
    }
}

// ✅ Prefer - explicit, context-rich handling
public function fetchUserFromApi(int $userId): User {
    try {
        $response = Http::timeout(10)
            ->retry(2, 100)
            ->throw()
            ->get("https://api.example.com/users/{$userId}");
        
        return User::create($response->json());
    } catch (ConnectionException $e) {
        throw new ExternalApiException(
            "Failed to connect to user service for user {$userId}",
            previous: $e
        );
    } catch (RequestException $e) {
        if ($e->response->status() === 404) {
            throw new UserNotFoundException("User {$userId} not found in external API");
        }
        throw new ExternalApiException(
            "API returned error for user {$userId}: {$e->response->status()}",
            previous: $e
        );
    }
}
```

#### Meaningful Logging

```php
// ❌ Avoid - vague or too verbose
Log::info('Process started');
Log::debug('User: ' . $user->toJson());

// ✅ Prefer - structured, context-rich logging
Log::info('User registration initiated', [
    'email' => $user->email,
    'ip_address' => request()->ip(),
    'user_agent' => request()->userAgent(),
]);

Log::warning('Payment failed for order', [
    'order_id' => $order->id,
    'amount' => $order->total,
    'reason' => $paymentException->getMessage(),
    'gateway' => 'stripe',
]);

Log::error('Database migration failed', [
    'migration' => 'create_posts_table',
    'error' => $exception->getMessage(),
    'trace' => $exception->getTraceAsString(),
]);
```

### 7. Eloquent Models & Relationships

#### Proper Model Design

```php
// ❌ Avoid - bloated model with no clear responsibility
class Post extends Model {
    public function author() { return $this->belongsTo(User::class); }
    public function comments() { return $this->hasMany(Comment::class); }
    public function likes() { return $this->hasMany(Like::class); }
    
    public function publish() { 
        $this->update(['published_at' => now()]);
        event(new PostPublished($this));
    }
    
    public function getCommentCount() {
        return $this->comments()->count();
    }
    
    public function sendNotifications() {
        // Notification logic here
    }
    
    public function generateSlug() {
        // Slug generation
    }
}

// ✅ Prefer - focused models with clear concerns
class Post extends Model {
    use HasTimestamps, Uuids, HasFactory;
    
    protected $fillable = ['title', 'content', 'author_id', 'published_at'];
    protected $casts = [
        'published_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    
    public function author(): BelongsTo {
        return $this->belongsTo(User::class);
    }
    
    public function comments(): HasMany {
        return $this->hasMany(Comment::class);
    }
    
    public function scopePublished(Builder $query): Builder {
        return $query->whereNotNull('published_at');
    }
    
    public function scopeByAuthor(Builder $query, User $user): Builder {
        return $query->where('author_id', $user->id);
    }
}

// Separate concerns into services/actions:
class PublishPostAction {
    public function __invoke(Post $post): void {
        $post->update(['published_at' => now()]);
        event(new PostPublished($post));
        NotifyFollowersJob::dispatch($post);
    }
}
```

#### Type-Safe Relationships

```php
// ✅ Use strict types and return types
class Post extends Model {
    // Clearly indicate return types
    public function author(): BelongsTo {
        return $this->belongsTo(User::class, 'author_id');
    }
    
    public function comments(): HasMany {
        return $this->hasMany(Comment::class)->orderByDesc('created_at');
    }
    
    public function tags(): BelongsToMany {
        return $this->belongsToMany(
            Tag::class,
            'post_tags',
            'post_id',
            'tag_id'
        )->withTimestamps();
    }
}

// Usage with type safety:
$post = Post::findOrFail($id);
$authorName = $post->author->name; // Type-safe
$comments = $post->comments()->approved()->get(); // Chainable
```

### 8. Jobs, Events & Queues

#### Asynchronous Processing

```php
// ❌ Avoid - synchronous heavy operations in requests
public function store(StoreOrderRequest $request) {
    $order = Order::create($request->validated());
    
    // Blocking operations
    Mail::send(new OrderConfirmation($order));
    $this->generateInvoicePdf($order);
    $this->syncWithWarehouse($order);
    
    return $order; // Takes 5+ seconds
}

// ✅ Prefer - queue heavy operations
public function store(StoreOrderRequest $request) {
    $order = Order::create($request->validated());
    
    // Dispatch to queue
    ProcessOrderJob::dispatch($order);
    
    return OrderResource::make($order); // Responds immediately
}

class ProcessOrderJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function __construct(private Order $order) {}
    
    public function handle(): void {
        Mail::send(new OrderConfirmation($this->order));
        GenerateInvoiceJob::dispatch($this->order);
        SyncWithWarehouseJob::dispatch($this->order);
        
        Log::info('Order processed', ['order_id' => $this->order->id]);
    }
    
    public function failed(Throwable $exception): void {
        Log::error('Order processing failed', [
            'order_id' => $this->order->id,
            'error' => $exception->getMessage(),
        ]);
        
        $this->order->markAsProcessingFailed();
    }
}
```

#### Domain Events

```php
// ✅ Use events for domain logic
class OrderPlaced extends ShouldBroadcast {
    public function __construct(public Order $order) {}
    
    public function broadcastOn(): array {
        return [new PrivateChannel("user.{$this->order->user_id}")];
    }
}

// In controller/service:
event(new OrderPlaced($order));

// Handle multiple listeners:
class EventServiceProvider extends ServiceProvider {
    protected $listen = [
        OrderPlaced::class => [
            SendOrderConfirmationEmail::class,
            GenerateInvoice::class,
            SyncWithWarehouse::class,
            NotifyInventory::class,
        ],
    ];
}

class SendOrderConfirmationEmail implements ShouldQueue {
    public function handle(OrderPlaced $event): void {
        Mail::send(new OrderConfirmation($event->order));
    }
}
```

### 9. Documentation

#### JSDoc-style PHP Documentation

```php
// ✅ Document complex logic with PHPDoc
/**
 * Process refund for an order with partial refund support.
 * 
 * Uses exponential backoff for payment gateway retries to prevent
 * overwhelming the provider (see ticket PAYMENT-4521).
 * 
 * @param Order $order The order to refund
 * @param float $amount Amount to refund (null for full refund)
 * @return RefundResult Contains refund_id, status, and processed_at
 * @throws OrderNotRefundableException If order state doesn't allow refunds
 * @throws PaymentGatewayException If refund processing fails after retries
 */
public function refundOrder(Order $order, ?float $amount = null): RefundResult {
    throw_unless(
        $order->canBeRefunded(),
        OrderNotRefundableException::class,
        "Order {$order->id} cannot be refunded in {$order->status} state"
    );
    
    $refundAmount = $amount ?? $order->total;
    
    return retry(
        times: 3,
        delay: 100,
        callback: fn() => $this->gateway->refund($order, $refundAmount),
        when: fn(Throwable $e) => $e instanceof TemporaryPaymentException,
    );
}

// Document "why", not "what":
// The system retries refunds because payment gateways occasionally
// timeout temporarily but recover quickly. Manual retries would be
// cumbersome and error-prone, so we do it automatically.
```

### 10. Migrations & Database Design

#### Safe Migrations

```php
// ❌ Avoid - risky operations
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('email')->unique(); // Can fail if duplicate data exists
    $table->dropColumn('unused_field'); // Loses data
    $table->integer('status'); // No clarity on values
});

// ✅ Prefer - safe, clear migrations
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
    $table->timestamps();
    $table->softDeletes();
    
    $table->index('email');
    $table->index(['status', 'created_at']);
});

// For schema changes in production:
Schema::table('users', function (Blueprint $table) {
    // Add new column with default to avoid NULL issues
    $table->string('phone')->nullable()->after('email');
});

// Then in separate migration, remove old column:
// Schema::table('users', function (Blueprint $table) {
//     $table->dropColumn('old_phone');
// });
```

## Implementation Procedure

When writing Laravel code, follow this workflow:

### Step 1: Understand Requirements & Design
- Clarify inputs, outputs, and business rules
- Identify edge cases and error scenarios
- Design API contracts (request/response shapes)
- Plan service layer boundaries

### Step 2: Structure with SOLID Principles
- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Design for extension, not modification
- **Liskov Substitution**: Use contracts/interfaces properly
- **Interface Segregation**: Depend on focused interfaces
- **Dependency Inversion**: Inject dependencies via constructor

### Step 3: Implement Using Laravel's Tools
- Use Form Requests for validation
- Use Services for business logic
- Use Repositories for data access
- Use Resources for API responses
- Use Actions/Jobs for complex operations

### Step 4: Apply Modern PHP 8.3+
- Use constructor property promotion
- Use match expressions for type-safe logic
- Use named arguments for clarity
- Use union/intersection types
- Use enums for status values
- Use readonly properties where appropriate

### Step 5: Ensure Security
- Validate all inputs via Form Requests
- Check authorization on every action
- Use parameterized queries (Eloquent does this)
- Escape output in Blade templates
- Use CSRF middleware and token validation

### Step 6: Handle Errors Explicitly
- Throw specific exception types
- Catch specific exceptions, not generic `Exception`
- Log with context for debugging
- Provide meaningful error messages to users

### Step 7: Test & Document
- Write meaningful unit/feature tests
- Document business logic in comments
- Add PHPDoc for public methods
- Reference tickets for policy decisions

## Common Patterns

### API Endpoint (Controller + Request + Resource)

```php
// routes/api.php
Route::apiResource('posts', PostController::class);

// app/Http/Controllers/PostController.php
class PostController extends Controller {
    public function __construct(private PostService $postService) {}
    
    public function index(Request $request) {
        $posts = Post::query()
            ->with('author')
            ->withCount('comments')
            ->paginate($request->input('per_page', 15));
        
        return PostResource::collection($posts);
    }
    
    public function store(StorePostRequest $request) {
        $post = $this->postService->create($request->validated());
        return PostResource::make($post);
    }
    
    public function show(Post $post) {
        return PostResource::make($post->load('author', 'comments'));
    }
    
    public function update(UpdatePostRequest $request, Post $post) {
        $this->authorize('update', $post);
        
        $post = $this->postService->update($post, $request->validated());
        return PostResource::make($post);
    }
    
    public function destroy(Post $post) {
        $this->authorize('delete', $post);
        
        $this->postService->delete($post);
        return response()->noContent();
    }
}

// app/Http/Requests/StorePostRequest.php
class StorePostRequest extends FormRequest {
    public function authorize(): bool {
        return auth()->check();
    }
    
    public function rules(): array {
        return [
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'min:10'],
            'tags' => ['array', 'max:5'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}

// app/Http/Resources/PostResource.php
class PostResource extends JsonResource {
    public function toArray(Request $request): array {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'author' => new UserResource($this->whenLoaded('author')),
            'comments_count' => $this->when(isset($this->comments_count), $this->comments_count),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

### Service Class Pattern

```php
class UserRegistrationService {
    public function __construct(
        private UserRepository $userRepository,
        private EmailService $emailService,
        private AuthTokenService $tokenService,
    ) {}
    
    public function register(array $data): UserRegistrationResult {
        throw_if(
            User::where('email', $data['email'])->exists(),
            ConflictException::class,
            'Email already registered'
        );
        
        $user = $this->userRepository->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        
        try {
            $this->emailService->sendVerificationEmail($user);
        } catch (EmailException $e) {
            Log::error('Failed to send verification email', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
        
        $token = $this->tokenService->generateApiToken($user);
        
        return new UserRegistrationResult(
            user: $user,
            token: $token,
        );
    }
}
```

### Query Scope Pattern

```php
class User extends Model {
    public function scopeActive(Builder $query): Builder {
        return $query->where('status', UserStatus::ACTIVE);
    }
    
    public function scopeEmailVerified(Builder $query): Builder {
        return $query->whereNotNull('email_verified_at');
    }
    
    public function scopeWithOrderStats(Builder $query): Builder {
        return $query->withCount('orders')
            ->withSum('orders', 'total');
    }
    
    public function scopeCreatedAfter(Builder $query, CarbonInterface $date): Builder {
        return $query->where('created_at', '>=', $date);
    }
}

// Usage:
User::active()
    ->emailVerified()
    ->withOrderStats()
    ->createdAfter(now()->subMonth())
    ->get();
```

## Quick Checklist

Before submitting code, verify:

- [ ] Uses PHP 8.3+ features (constructor promotion, match, named args, null-safe)
- [ ] Request validation via Form Request, not controller
- [ ] Business logic in Service/Action classes, not controllers
- [ ] Data access via Repository pattern or query scopes
- [ ] All inputs validated and sanitized
- [ ] All outputs escaped/authorized in Blade templates
- [ ] Authorization checks on every action
- [ ] Specific exceptions caught, never bare `catch (Exception)`
- [ ] No N+1 queries (eager load relationships, use counts)
- [ ] Error handling explicit with meaningful messages
- [ ] Logging includes context (user ID, resource ID, etc.)
- [ ] Class/method names clearly describe intent (no abbreviations)
- [ ] Single responsibility per class/method
- [ ] Dependencies injected, not instantiated internally
- [ ] Events used for domain logic coupling
- [ ] Jobs used for heavy/async operations
- [ ] Database migrations safe for production (no data loss)
- [ ] Models focused on data, business logic in services
- [ ] PHPDoc on public methods explaining "why"
- [ ] No code duplication (extract to traits/helpers)
- [ ] No features added "just in case" (YAGNI)

## Resources

- [Laravel 11 Documentation](https://laravel.com/docs)
- [PHP 8.3 Features](https://www.php.net/manual/en/migration83.php)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code PHP](https://github.com/piotrplenik/clean-code-php)
