# MongoDB шилжилт

## 1. .env тохируулах

`DATABASE_URL`-д MongoDB connection string оруулна. **Database нэрийг host-ийн дараа заавал нэмнэ:**

```
# Буруу (database нэр байхгүй):
# mongodb+srv://user:pass@capullo.axzxqwd.mongodb.net

# Зөв:
DATABASE_URL="mongodb+srv://user:pass@capullo.axzxqwd.mongodb.net/capullo?retryWrites=true&w=majority"
```

`.axzxqwd.mongodb.net` дараа `/capullo` нэмнэ (эсвэл өөр database нэр).

## 2. Schema push

```bash
pnpm prisma db push
```

MongoDB-д migration байхгүй тул `db push` ашиглана.

## 3. Өгөгдлийн шилжилт

PostgreSQL-ээс MongoDB руу өгөгдөл шилжүүлэх бол өөр script хэрэгтэй.
