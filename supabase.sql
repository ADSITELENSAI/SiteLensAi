-- Create a table for public user profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for user posts
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for comments on posts
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- PROFILES POLICIES
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- POSTS POLICIES
create policy "Posts are viewable by everyone." on public.posts
  for select using (true);

create policy "Authenticated users can create posts." on public.posts
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update their own posts." on public.posts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own posts." on public.posts
  for delete using (auth.uid() = user_id);

-- COMMENTS POLICIES
create policy "Comments are viewable by everyone." on public.comments
  for select using (true);

create policy "Authenticated users can create comments." on public.comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can delete their own comments." on public.comments
  for delete using (auth.uid() = user_id);

-- AUTOMATION: Create a profile automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();