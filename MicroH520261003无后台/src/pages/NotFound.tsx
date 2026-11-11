import React from 'react';
import { Link } from 'wouter';
import { Button, Result } from 'antd-mobile';
import { HomeOutlined } from '@ant-design/icons';

export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <Result status="info" title="页面不存在" description="您访问的页面可能已调整或路径有误" />
        <Link href="/">
          <Button block color="primary" size="large" className="!rounded-full">
            <HomeOutlined className="mr-2" />返回首页
          </Button>
        </Link>
      </div>
    </div>
  );
}
