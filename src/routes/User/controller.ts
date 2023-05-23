import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { StatusCodes } from 'http-status-codes';
import { User, formatUserReturn, UserReturn } from '../../entities/User';

export interface LoginReturn extends UserReturn {
  token: string;
}

// POST
// Login user
export async function login(req: Request, res: Response<LoginReturn | string>): Promise<Response<LoginReturn | string>> {
  const userRepository = getRepository(User);
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(StatusCodes.BAD_REQUEST).send("Bad Request");

  const user = await userRepository.findOne({ where: { username: username }});
  if (!user)
    return res.status(StatusCodes.UNAUTHORIZED).send("Wrong username or password");
  if (!user.checkPassword(password))
    return res.status(StatusCodes.UNAUTHORIZED).send("Wrong username or password");

  const token = user.getJWTToken();
  res.setHeader('Authorization', token);
  return res.status(StatusCodes.OK).json({
    token: token,
    ...formatUserReturn(user)
  });
}

// POST
// Register user
export async function register(req: Request, res: Response<LoginReturn | string>): Promise<Response<LoginReturn | string>> {
  const userRepository = getRepository(User);
  const { email, password, username } = req.body;

  if (!email || !password || !username)
    return res.status(StatusCodes.BAD_REQUEST).send("Bad Request");

  const isUsernameCorrect = username.match(/^[a-z0-9A-Z]+$/);

  if (!isUsernameCorrect)
    return res.status(StatusCodes.BAD_REQUEST).send("Username must be only alphanumeric (Characters from a-Z and 0-9)");
  
  if (await userRepository.findOne({ email: email }))
    return res.status(StatusCodes.CONFLICT).send("Email already used");
  if (await userRepository.findOne({ username: username }))
    return res.status(StatusCodes.CONFLICT).send("Username already used");

  const user = await userRepository.save(
    userRepository.create({
      email,
      password,
      username,
    })
  );
  const token = user.getJWTToken();
  res.setHeader('Authorization', token);
  return res.status(StatusCodes.CREATED).json({
    token,
    ...formatUserReturn(user)
  })
}

// GET
// Return all users
// Should be Admin Only
export async function getAllUsers(req: Request, res: Response<Array<UserReturn>>): Promise<void> {
  const userRepository = getRepository(User);

  const users = await userRepository.find();
  res.status(StatusCodes.OK).json(users.map((user) => formatUserReturn(user)));
}

// GET
// Returns user
export async function get(req: Request, res: Response<UserReturn | string>): Promise<Response<UserReturn | string>> {
  const userRepository = getRepository(User);
  const userId = res.locals.user.id;

  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user)
    return res.status(StatusCodes.NOT_FOUND).send('User not found');
  return res.status(StatusCodes.OK).json(formatUserReturn(user));
}

// PUT
// Update user
export async function update(req: Request, res: Response<UserReturn | string>): Promise<Response<UserReturn | string>> {
  const userRepository = getRepository(User);
  const { username, password } = req.body;
  const userId = res.locals.user.id;

  const user = await userRepository.findOne(userId);
  if (!user)
    return res.status(StatusCodes.NOT_FOUND).send('User not found');

  user.username = username !== undefined ? username : user.username;
  user.password = password !== undefined ? password : user.password;
  await userRepository.save(user);

  return res.status(StatusCodes.OK).json(formatUserReturn(user));
}

// DELETE
// Remove user
export async function del(req: Request, res: Response<UserReturn | string>): Promise<Response<UserReturn | string>> {
  const userRepository = getRepository(User);
  const userId = res.locals.user.id;

  const user = await userRepository.findOne(userId);
  if (!user)
    return res.status(StatusCodes.NOT_FOUND).send('User not found');

  await userRepository.remove(user);
  return res.sendStatus(StatusCodes.OK).json(formatUserReturn(user));
}