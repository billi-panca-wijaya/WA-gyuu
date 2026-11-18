import { Controller, Get, Req, Res, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from './common/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  private logoBase64: string = '';

  constructor() {
    try {
      const logoPath = path.resolve(__dirname, '../public/wagyuu-logo.jpg');
      if (fs.existsSync(logoPath)) {
        this.logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch {
      // fallback
    }
  }

  @Public()
  @Get('wagyuu-logo.jpg')
  getLogo(@Res() res: Response) {
    const logoPath = path.resolve(__dirname, '../public/wagyuu-logo.jpg');
    if (fs.existsSync(logoPath)) {
      return res.sendFile(logoPath);
    }
    return res.status(404).send('Not Found');
  }

  @Public()
  @Get()
  getRoot(@Req() req: Request, @Res() res: Response) {
    const acceptsHtml = req.headers['accept']?.includes('text/html');

    if (!acceptsHtml) {
      return res.json({
        service: 'WAgyuu Central Gateway',
        status: 'prototype',
        portal: '/admin/login',
      });
    }

    return res.redirect('/admin/login');
  }

  @Public()
  @Get('admin')
  serveAdminRoot(@Res() res: Response) {
    const indexPath = path.resolve(__dirname, '../public/admin/index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.redirect('/admin/login');
  }

  @Public()
  @Get('admin/login')
  serveAdminLogin(@Res() res: Response) {
    const indexPath = path.resolve(__dirname, '../public/admin/index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(404).send('Portal IT console build not found. Please run npm run build.');
  }

  @Public()
  @Get('admin/assets/:file')
  serveAdminAssets(@Param('file') file: string, @Res() res: Response) {
    const assetPath = path.resolve(__dirname, `../public/admin/assets/${file}`);
    if (fs.existsSync(assetPath)) {
      if (file.endsWith('.js')) {
        res.type('application/javascript');
      } else if (file.endsWith('.css')) {
        res.type('text/css');
      }
      return res.sendFile(assetPath);
    }
    return res.status(404).send('Asset Not Found');
  }

  @Public()
  @Get('admin/*')
  serveAdminSpa(@Req() req: Request, @Res() res: Response) {
    // If request is for an asset
    if (req.path.startsWith('/admin/assets/')) {
      const fileName = path.basename(req.path);
      const assetPath = path.resolve(__dirname, `../public/admin/assets/${fileName}`);
      if (fs.existsSync(assetPath)) {
        if (fileName.endsWith('.js')) res.type('application/javascript');
        else if (fileName.endsWith('.css')) res.type('text/css');
        return res.sendFile(assetPath);
      }
    }

    const indexPath = path.resolve(__dirname, '../public/admin/index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(404).send('Portal IT console build not found.');
  }
}
